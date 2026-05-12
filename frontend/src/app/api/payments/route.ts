import { NextRequest, NextResponse } from "next/server";

const PAYMENTS_API = "https://payments.magicblock.app";
const CUSTOM_USDC_MINT = "DYmmsuCFFfb5XpgTXDnietaHzGToGz6GtJ2Tx6FQ7JjH";

export async function GET(req: NextRequest) {
  const pubkey = req.nextUrl.searchParams.get("pubkey");
  if (!pubkey) return NextResponse.json({ error: "pubkey required" }, { status: 400 });

  try {
    const resp = await fetch(`${PAYMENTS_API}/v1/spl/challenge?pubkey=${pubkey}&cluster=devnet`);
    const data = await resp.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "login") {
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, cluster: "devnet" }),
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "balance") {
      const { address } = body;
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/balance?address=${address}&mint=${CUSTOM_USDC_MINT}&cluster=devnet`);
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "private-balance") {
      const { address, token } = body;
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/private-balance?address=${address}&mint=${CUSTOM_USDC_MINT}&cluster=devnet`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "transfer") {
      const { token, ...params } = body;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${PAYMENTS_API}/v1/spl/transfer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...params, cluster: "devnet", mint: CUSTOM_USDC_MINT }),
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "deposit") {
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, cluster: "devnet", mint: CUSTOM_USDC_MINT, initIfMissing: true, initAtasIfMissing: true, initVaultIfMissing: true, idempotent: true }),
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "withdraw") {
      const { token, ...params } = body;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/withdraw`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...params, cluster: "devnet", mint: CUSTOM_USDC_MINT, initIfMissing: true, initAtasIfMissing: true }),
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "initialize-mint") {
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/initialize-mint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, cluster: "devnet", mint: CUSTOM_USDC_MINT }),
      });
      const data = await resp.json();
      return NextResponse.json(data);
    }

    if (action === "is-mint-initialized") {
      const resp = await fetch(`${PAYMENTS_API}/v1/spl/is-mint-initialized?mint=${CUSTOM_USDC_MINT}&cluster=devnet`);
      const data = await resp.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
