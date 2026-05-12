import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || process.env.SOLANA_RPC_URL?.split("api-key=")[1] || "";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
}

// Simple cache to avoid hitting Tavily rate limits
const searchCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function tavilySearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!TAVILY_API_KEY) {
    console.log("[Tavily] No API key configured, skipping web search");
    return [];
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Tavily] Using cached results for "${query.slice(0, 40)}..."`);
    return cached.results;
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        include_answer: true,
        search_depth: "basic",
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 432) {
        console.log(`[Tavily] Rate limited (status ${response.status}), returning empty results`);
      } else {
        console.error(`[Tavily] API error: ${response.status}`);
      }
      return [];
    }

    const data = await response.json() as any;
    const results: SearchResult[] = (data.results || []).map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      snippet: r.content || r.snippet || "",
    }));

    const answer = data.answer as string | undefined;
    if (answer && results.length > 0) {
      results.unshift({
        title: "Tavily AI Summary",
        url: "",
        snippet: answer,
      });
    }

    console.log(`[Tavily] Found ${results.length} results for "${query.slice(0, 40)}..."`);
    
    // Cache results
    searchCache.set(cacheKey, { results, timestamp: Date.now() });
    
    return results;
  } catch (err: any) {
    console.error(`[Tavily] Error: ${err.message?.slice(0, 80)}`);
    return [];
  }
}

// Cache for CoinGecko prices
const priceCache: Map<string, { prices: CryptoPrice[]; timestamp: number }> = new Map();
const PRICE_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function coingeckoPrices(symbols: string[], attempt: number = 1): Promise<CryptoPrice[]> {
  // Check cache first
  const cacheKey = symbols.sort().join(",").toLowerCase();
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL_MS) {
    console.log(`[CoinGecko] Using cached prices for ${symbols.join(", ")}`);
    return cached.prices;
  }

  try {
    const ids = symbols.map(s => s.toLowerCase()).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url);

    if (response.status === 429 && attempt <= 2) {
      const delay = attempt * 3000;
      console.log(`[CoinGecko] Rate limited, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return coingeckoPrices(symbols, attempt + 1);
    }

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`[CoinGecko] Rate limited, using cached/empty results`);
      } else {
        console.error(`[CoinGecko] API error: ${response.status}`);
      }
      return [];
    }

    const data = await response.json() as any;
    const prices: CryptoPrice[] = [];
    for (const symbol of symbols) {
      const id = symbol.toLowerCase();
      if (data[id]) {
        prices.push({
          symbol: symbol.toUpperCase(),
          price: data[id].usd || 0,
          change24h: data[id].usd_24h_change || 0,
        });
      }
    }
    console.log(`[CoinGecko] Fetched ${prices.length} prices`);
    
    // Cache results
    priceCache.set(cacheKey, { prices, timestamp: Date.now() });
    
    return prices;
  } catch (err: any) {
    console.error(`[CoinGecko] Error: ${err.message?.slice(0, 80)}`);
    return [];
  }
}

export async function heliusOnChainData(query: string): Promise<string> {
  if (!HELIUS_API_KEY) {
    return "";
  }

  try {
    const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "searchAssets",
        params: {
          ownerAddress: undefined,
          compressedCollectionMint: undefined,
          grouping: undefined,
          interface: undefined,
          displayOptions: {},
          sort: { sortKey: "created", sortDirection: "asc" },
          limit: 3,
          searchQuery: query.slice(0, 50),
        },
      }),
    });

    if (!response.ok) return "";
    const data = await response.json() as any;
    if (!data.result?.items?.length) return "";
    
    const summaries = data.result.items.slice(0, 3).map((item: any) => {
      return `${item.content?.metadata?.name || "Unknown"}: ${item.content?.metadata?.symbol || ""}`;
    }).join("; ");

    return `On-chain assets found: ${summaries}`;
  } catch (err: any) {
    return "";
  }
}

export function isCryptoRelated(category: string, questionText: string): boolean {
  const cryptoKeywords = ["btc", "bitcoin", "sol", "solana", "eth", "ethereum", "crypto", "defi", "nft", "token", "price", "market cap", "blockchain", "swap", "lend", "borrow", "apy", "tvl", "airdrop"];
  const text = `${category} ${questionText}`.toLowerCase();
  return cryptoKeywords.some(kw => text.includes(kw));
}

export function formatSearchData(searchResults: SearchResult[], prices: CryptoPrice[], onChainData: string): string {
  const parts: string[] = [];

  if (searchResults.length > 0) {
    parts.push("WEB SEARCH RESULTS:");
    for (const r of searchResults.slice(0, 5)) {
      parts.push(`- ${r.title}: ${r.snippet.slice(0, 200)}`);
    }
  }

  if (prices.length > 0) {
    parts.push("\nCURRENT CRYPTO PRICES:");
    for (const p of prices) {
      const changeStr = p.change24h !== 0 ? ` (${p.change24h > 0 ? "+" : ""}${p.change24h.toFixed(1)}% 24h)` : "";
      parts.push(`- ${p.symbol}: $${p.price.toLocaleString()}${changeStr}`);
    }
  }

  if (onChainData) {
    parts.push(`\nON-CHAIN DATA: ${onChainData}`);
  }

  return parts.join("\n");
}
