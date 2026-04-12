"use client";

import { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";
import "@solana/wallet-adapter-react-ui/styles.css";

// We dynamically import this in layout to avoid SSR issues
export const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Use MagicBlock Devnet Router
  const endpoint = useMemo(() => "https://devnet-router.magicblock.app/", []);
  const connection = useMemo(
    () => new ConnectionMagicRouter(endpoint, { wsEndpoint: "wss://devnet-router.magicblock.app/" }),
    [endpoint]
  );
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
