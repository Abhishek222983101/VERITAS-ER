import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FloatingHeader } from "@/components/ui/floating-header";
import { WalletProvider } from "@/components/providers/wallet-provider";
import { AnchorProviderWrapper } from "@/components/providers/anchor-provider";
import { BufferPolyfill } from "@/components/providers/buffer-polyfill";

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
  title: "VERITAS | Private Oracle Intelligence",
  description:
    "Autonomous AI oracle protocol — 5 specialized agents cryptographically vote to determine truth. Powered by Solana + MagicBlock.",
};

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
        <WalletProvider>
          <AnchorProviderWrapper>
            <BufferPolyfill />
            <div className="relative z-50 pt-4">
              <FloatingHeader />
            </div>
            {children}
          </AnchorProviderWrapper>
        </WalletProvider>
      </body>
    </html>
  );
}
