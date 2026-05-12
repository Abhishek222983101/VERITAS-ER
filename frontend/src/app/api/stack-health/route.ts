import { NextResponse } from "next/server";

const ER_RPC = "https://devnet-as.magicblock.app";
const TEE_RPC = "https://devnet-tee.magicblock.app";
const PAYMENTS_API = "https://payments.magicblock.app";

async function pingRpc(url: string, label: string): Promise<{ live: boolean; slot?: number; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
    });
    const data = await resp.json();
    const latencyMs = Date.now() - start;
    if (data.result === "ok" || data.result) {
      return { live: true, latencyMs };
    }
    return { live: false, error: data.error?.message || JSON.stringify(data.result), latencyMs };
  } catch (e: any) {
    return { live: false, error: e.message, latencyMs: Date.now() - start };
  }
}

async function pingPaymentsApi(): Promise<{ live: boolean; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const resp = await fetch(`${PAYMENTS_API}/v1/spl/is-mint-initialized?mint=DYmmsuCFFfb5XpgTXDnietaHzGToGz6GtJ2Tx6FQ7JjH&cluster=devnet`);
    const data = await resp.json();
    const latencyMs = Date.now() - start;
    return { live: data.initialized === true || resp.ok, latencyMs };
  } catch (e: any) {
    return { live: false, error: e.message, latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const [er, tee, payments] = await Promise.all([
    pingRpc(ER_RPC, "ER"),
    pingRpc(TEE_RPC, "TEE"),
    pingPaymentsApi(),
  ]);

  return NextResponse.json({
    er: { ...er, url: ER_RPC, label: "Ephemeral Rollup" },
    tee: { ...tee, url: TEE_RPC, label: "TEE Validator" },
    payments: { ...payments, url: PAYMENTS_API, label: "Private Payments API" },
    checkedAt: new Date().toISOString(),
  });
}
