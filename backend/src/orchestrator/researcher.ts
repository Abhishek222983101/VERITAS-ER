import { AGENTS, parseLLMResponse } from "./agents";
import { SearchResult, CryptoPrice, formatSearchData } from "./search";

interface ResearchResult {
  vote: number;
  confidence: number;
  reasoning: string;
  evidenceHash: number[];
}

export async function researchQuestion(
  agentKey: string,
  questionText: string,
  category: string,
  groqApiKey: string,
  mistralApiKey?: string,
  searchResults?: SearchResult[],
  priceData?: CryptoPrice[],
  onChainData?: string
): Promise<ResearchResult> {
  const agent = AGENTS[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);

  const defaultResult: ResearchResult = {
    vote: 2,
    confidence: 30,
    reasoning: "API unavailable - defaulting to UNSURE",
    evidenceHash: new Array(32).fill(0),
  };

  let prompt = `QUESTION: ${questionText}\nCATEGORY: ${category}`;

  const dataSection = formatSearchData(searchResults || [], priceData || [], onChainData || "");
  if (dataSection) {
    prompt += `\n\n${dataSection}`;
  }

  prompt += `\n\nBased on all available data above, evaluate this question and provide your vote.`;

  // Try Mistral first (Groq is currently restricted for this organization)
  if (mistralApiKey) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${mistralApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: agent.systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: agent.votingStyle === "contrarian" ? 0.8 : agent.votingStyle === "conservative" ? 0.3 : 0.5,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || "";
        const parsed = parseLLMResponse(content);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(parsed.reasoning));
        const evidenceHash = Array.from(new Uint8Array(hashBuffer));
        console.log(`[${agent.name}] Vote: ${["YES", "NO", "UNSURE"][parsed.vote]} (${parsed.confidence}%) — ${parsed.reasoning.slice(0, 80)}`);
        return { ...parsed, evidenceHash };
      }
      
      const errorBody = await response.text().catch(() => "no body");
      console.error(`Mistral API error for ${agent.name}: HTTP ${response.status} — ${errorBody.slice(0, 200)}`);
    } catch (err: any) {
      console.error(`Mistral error for ${agent.name}: ${err.message}`);
    }
  }

  // Fallback to Groq
  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: agent.systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: agent.votingStyle === "contrarian" ? 0.8 : agent.votingStyle === "conservative" ? 0.3 : 0.5,
          max_tokens: 300,
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const content = data.choices?.[0]?.message?.content || "";
        const parsed = parseLLMResponse(content);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(parsed.reasoning));
        const evidenceHash = Array.from(new Uint8Array(hashBuffer));
        console.log(`[${agent.name}] Vote: ${["YES", "NO", "UNSURE"][parsed.vote]} (${parsed.confidence}%) — ${parsed.reasoning.slice(0, 80)}`);
        return { ...parsed, evidenceHash };
      }
      
      const errorBody = await response.text().catch(() => "no body");
      console.error(`Groq API error for ${agent.name}: HTTP ${response.status} — ${errorBody.slice(0, 200)}`);
    } catch (err: any) {
      console.error(`Groq error for ${agent.name}: ${err.message}`);
    }
  }

  console.log(`[${agent.name}] All APIs failed — defaulting to UNSURE`);
  return defaultResult;
}
