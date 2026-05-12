import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { HELIUS_RPC, PROGRAM_ID } from "@/lib/constants";

export async function GET() {
  try {
    const connection = new Connection(HELIUS_RPC, "confirmed");
    const configPda = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];

    const { AnchorProvider, Program } = await import("@coral-xyz/anchor");
    const IDL_JSON = (await import("@/lib/idl.json")).default;

    const provider = new AnchorProvider(connection, {} as any, { commitment: "confirmed" });
    const program = new Program(IDL_JSON as any, provider as any);

    const config = await (program as any).account.config.fetch(configPda);
    return NextResponse.json({
      admin: config.admin?.toBase58?.(),
      treasury: config.treasury?.toBase58?.(),
      questionCounter: Number(config.questionCounter),
      committeeSize: Number(config.committeeSize),
      consensusThreshold: Number(config.consensusThreshold),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
