import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

// Import IDLs
import DiveIdentityIdl from "./idl/dive_identity.json";
import DiveMarketIdl from "./idl/dive_market.json";
import DiveOracleIdl from "./idl/dive_oracle.json";

export const DIVE_IDENTITY_PROGRAM_ID = new PublicKey(DiveIdentityIdl.address);
export const DIVE_MARKET_PROGRAM_ID = new PublicKey(DiveMarketIdl.address);
export const DIVE_ORACLE_PROGRAM_ID = new PublicKey(DiveOracleIdl.address);

export function useDivePrograms() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    // If wallet is not connected, use a dummy wallet for readonly queries
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    return new AnchorProvider(connection, wallet || dummyWallet, AnchorProvider.defaultOptions());
  }, [connection, wallet]);

  const diveIdentity = useMemo(() => {
    return new Program(DiveIdentityIdl as Idl, provider);
  }, [provider]);

  const diveMarket = useMemo(() => {
    return new Program(DiveMarketIdl as Idl, provider);
  }, [provider]);

  const diveOracle = useMemo(() => {
    return new Program(DiveOracleIdl as Idl, provider);
  }, [provider]);

  return { diveIdentity, diveMarket, diveOracle, provider };
}
