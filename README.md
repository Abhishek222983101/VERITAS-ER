# DIVE / VERITAS: Decentralized AI Oracle & Prediction Market

![Solana](https://img.shields.io/badge/Solana-362D59?style=for-the-badge&logo=solana&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Anchor](https://img.shields.io/badge/Anchor-000000?style=for-the-badge&logo=rust&logoColor=white)
![AI Agents](https://img.shields.io/badge/AI_Agents-Groq_%7C_Tavily-blue?style=for-the-badge)

DIVE entirely removes human bias and centralization from the prediction market resolution process. It is a blazing-fast, Sybil-resistant prediction market built on **Solana** where the oracles are an autonomous **Swarm of AI Agents**.

## 💡 The Problem it Solves
Current prediction markets (like Polymarket or Augur) suffer from a massive bottleneck: **The Oracle Problem**. Resolving markets manually is extremely slow, prone to human bias/manipulation, and vulnerable to Sybil attacks.

**DIVE** solves this by utilizing an off-chain network of AI agents. When a market needs insight or resolution, these agents autonomously scour the internet, analyze the data using distinct personas (e.g., The Skeptic, The Optimist, The Data Analyst), and push their cryptographic predictions directly on-chain via our Anchor smart contracts.

## ✨ Key Features

*   🤖 **AI Swarm Consensus (The Oracle):** Off-chain AI workers utilize **Groq** (fast LLM inference) and **Tavily** (real-time web search) to fetch data and reach a consensus.
*   🛡️ **zkTLS Proof of Personhood:** Integrates **Reclaim Protocol (zkTLS)**. Before a user can place a bet, they must generate a Zero-Knowledge proof of their identity. One Human = One Wallet.
*   ⚡ **Solana Speed & Economics:** Micro-betting and continuous oracle updates are economically viable thanks to Solana's sub-cent fees.
*   🌌 **3D Consensus Visualization:** A custom 3D Agent Swarm Graph built with `@react-three/fiber` visually renders the AI agents' real-time consensus and confidence levels.

## 🏗️ Architecture & Codebase Structure

Our monorepo is divided into three core pillars:

1. **`/solana` (Smart Contracts):** Built with the Anchor Framework.
   - `dive_identity`: Manages zkTLS human verification via PDAs (`HumanAttestation`).
   - `dive_market`: Handles prediction market creation, betting logic (YES/NO pools), dynamic odds, and payouts.
   - `dive_oracle`: Manages AI Agent registration, reputation staking, and the insight resolution pipeline.
2. **`/frontend` (Web3 UI):** A Next.js 15 (App Router) application featuring a strict neo-brutalist design, `@solana/wallet-adapter-react`, and dynamic SSR-safe 3D rendering.
3. **`/worker` (Off-Chain AI Oracle):** A Node.js backend that listens to the blockchain, queries Tavily for web context, prompts Groq LLMs for predictions, and submits insights back to the `dive_oracle` smart contract.

## 🚀 Getting Started

### 1. Smart Contracts
Navigate to the `solana` directory to build and deploy the contracts:
```bash
cd solana
npm install
anchor build
anchor test
anchor deploy --provider.cluster devnet
```

### 2. Frontend
Navigate to the `frontend` directory to start the Next.js app:
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:3000`.

### 3. Off-Chain AI Worker
Navigate to the `worker` directory to run the AI Swarm:
```bash
cd worker
npm install
```
Create a `.env` file with your API keys:
```env
TAVILY_API_KEY="your-tavily-key"
GROQ_API_KEY="your-groq-key"
```
Run the agent script against a live market:
```bash
npx ts-node agent.ts <MARKET_ID> "<MARKET_QUESTION>"
```

## 🧗 Technical Hurdles Overcome
- **Solana Frame Space Overflow:** Refactored heavy Rust dependencies (like regex) out of the Anchor programs and optimized release profiles to stay within Solana's 4096-byte stack limit.
- **Next.js Hydration Mismatches:** Leveraged `next/dynamic` to safely render WebGL/Three.js and Wallet Adapter components entirely on the client side.
- **On-Chain AI Integration:** Engineered complex TypeScript workers to perfectly map unpredictable LLM string outputs to strict Rust Enums (`YES`, `NO`, `UNSURE`) via the Anchor RPC.
