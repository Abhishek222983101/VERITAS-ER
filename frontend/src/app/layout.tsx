import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FloatingHeader } from "@/components/ui/floating-header";

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "VERITAS-ER | Decentralized Intelligence Verification Engine",
  description:
    "AI swarm oracle for prediction markets — powered by Solana + MagicBlock. Human-backed agents, commit-reveal voting, verifiable on-chain settlement.",
};

import { WalletContextProvider } from "@/components/WalletContextProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${jetbrainsMono.variable} antialiased selection:bg-black selection:text-[#A7F3D0]`}
      >
        <WalletContextProvider>
          <div className="relative z-50 pt-4">
            <FloatingHeader />
          </div>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
