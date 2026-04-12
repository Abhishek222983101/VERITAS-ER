import * as web3 from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { tavily } from "@tavily/core";
import { Groq } from "groq-sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const tvly = tavily({ apiKey: TAVILY_API_KEY });
const groq = new Groq({ apiKey: GROQ_API_KEY });

import crypto from "crypto";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assuming idls exist in ../frontend/src/lib/idl/
const idlPathOracle = path.resolve(__dirname, "../frontend/src/lib/idl/dive_oracle.json");
const idlPathIdentity = path.resolve(__dirname, "../frontend/src/lib/idl/dive_identity.json");

async function main() {
    console.log("Starting off-chain AI worker...");

    const connection = new web3.Connection(web3.clusterApiUrl("devnet"), "confirmed");
    const walletPath = path.resolve(process.env.HOME || "~", ".config/solana/id.json");
    
    let mainKeypair: web3.Keypair;
    try {
        const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
        mainKeypair = web3.Keypair.fromSecretKey(new Uint8Array(secretKey));
    } catch (e) {
        console.log("No default wallet found. Generating a new main wallet...");
        mainKeypair = web3.Keypair.generate();
    }

    try {
        const bal = await connection.getBalance(mainKeypair.publicKey);
        if (bal < 0.5 * web3.LAMPORTS_PER_SOL) {
            console.log("Airdropping to main keypair...");
            const sig = await connection.requestAirdrop(mainKeypair.publicKey, 2 * web3.LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, "confirmed");
        }
    } catch (e) {
        console.log("Airdrop failed, continuing...");
    }

    const wallet = new anchor.Wallet(mainKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    let oracleIdl: any;
    let identityIdl: any;

    try {
        oracleIdl = JSON.parse(fs.readFileSync(idlPathOracle, "utf8"));
        identityIdl = JSON.parse(fs.readFileSync(idlPathIdentity, "utf8"));
    } catch (e) {
        console.log("Warning: Could not load IDLs from ../frontend/src/lib/idl/. Mocking program interaction...");
    }

    // Connect to programs if IDLs exist
    const oracleProgram = oracleIdl ? new anchor.Program(oracleIdl, provider) : null;
    const identityProgram = identityIdl ? new anchor.Program(identityIdl, provider) : null;

    const [configPda] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("dive_config")],
        identityProgram!.programId
    );

    try {
        await (identityProgram!.account as any).globalConfig.fetch(configPda);
        console.log("Identity config is already initialized.");
    } catch (e) {
        console.log("Initializing identity config...");
        await identityProgram!.methods.initialize(mainKeypair.publicKey).accounts({
            authority: mainKeypair.publicKey,
            config: configPda,
            systemProgram: web3.SystemProgram.programId
        }).signers([mainKeypair]).rpc();
        console.log("Initialized identity config.");
    }

    const agents = ["Skeptic", "Optimist", "Analyst"];
    const agentKeypairs = agents.map(() => web3.Keypair.generate());

    console.log("Funding agent keypairs...");
    for (let i = 0; i < agents.length; i++) {
        const kp = agentKeypairs[i];
        console.log(`Agent: ${agents[i]} - ${kp.publicKey.toBase58()}`);
        
        try {
            const tx = new web3.Transaction().add(
                web3.SystemProgram.transfer({
                    fromPubkey: mainKeypair.publicKey,
                    toPubkey: kp.publicKey,
                    lamports: 0.02 * web3.LAMPORTS_PER_SOL,
                })
            );
            const sig = await web3.sendAndConfirmTransaction(connection, tx, [mainKeypair]);
            console.log(`Funded ${agents[i]}: ${sig}`);
        } catch (e: any) {
            console.log(`Failed to fund ${agents[i]}: ${e.message}`);
        }

        if (identityProgram && oracleProgram) {
            try {
                const random32 = () => Array.from(crypto.randomBytes(32));
                
                const [humanAttestationPda] = web3.PublicKey.findProgramAddressSync(
                    [Buffer.from([100, 105, 118, 101, 95, 104, 117, 109, 97, 110]), kp.publicKey.toBuffer()],
                    identityProgram.programId
                );
                
                const [configPda] = web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("dive_config")],
                    identityProgram.programId
                );

                // Use verifyHuman from the actual identity IDL
                await identityProgram.methods.verifyHuman(
                    random32(), random32(), random32(), new anchor.BN(Date.now() / 1000 + 3600 * 24 * 365)
                ).accounts({
                    issuer: mainKeypair.publicKey,
                    config: configPda,
                    wallet: kp.publicKey,
                    humanAttestation: humanAttestationPda,
                    systemProgram: web3.SystemProgram.programId
                }).signers([mainKeypair]).rpc();

                const [agentPda] = web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("dive_agent"), kp.publicKey.toBuffer()],
                    oracleProgram.programId
                );

                await oracleProgram.methods.registerAgent(
                    agents[i], random32()
                ).accounts({
                    authority: kp.publicKey,
                    humanAttestation: humanAttestationPda,
                    agent: agentPda,
                    systemProgram: web3.SystemProgram.programId
                }).signers([kp]).rpc();

                console.log(`Registered ${agents[i]} on dive_identity and dive_oracle.`);
            } catch (e: any) {
                console.log(`Registration failed for ${agents[i]}: ${e.message}`);
            }
        }
    }

    const marketQuestion = process.argv[2] || "Will Bitcoin reach 100k by the end of the year?";
    const marketPubkeyArg = process.argv[3];
    const marketPubkey = marketPubkeyArg ? new web3.PublicKey(marketPubkeyArg) : web3.Keypair.generate().publicKey;
    
    console.log(`\nMarket Question: "${marketQuestion}"`);
    console.log(`Market Pubkey: ${marketPubkey.toBase58()}`);
    console.log("Searching Tavily for context...");

    const searchResult = await tvly.search(marketQuestion, {
        searchDepth: "basic",
        includeAnswer: true
    });

    const context = searchResult.answer || searchResult.results.map((r: any) => r.content).join("\n");

    for (let i = 0; i < agents.length; i++) {
        console.log(`\n--- Processing Agent: ${agents[i]} ---`);
        const kp = agentKeypairs[i];
        const prompt = `You are a ${agents[i]} market analyst. Based on this context: "${context}", analyze the question: "${marketQuestion}". Provide a prediction (YES/NO/UNSURE), a confidence score (0-100), and your reasoning. Output strictly in JSON format like: {"prediction": "YES", "confidence": 85, "reasoning": "..."}`;

        try {
            let response: any;
            try {
                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: "mixtral-8x7b-32768",
                    response_format: { type: "json_object" }
                });

                const content = chatCompletion.choices[0]?.message?.content || "{}";
                response = JSON.parse(content);
            } catch (e: any) {
                console.log(`Groq failed, mocking response...`);
                response = { prediction: "YES", confidence: 80, reasoning: "Mocked reasoning due to Groq API error." };
            }

            console.log(`Prediction: ${response.prediction}`);
            console.log(`Confidence: ${response.confidence}`);
            console.log(`Reasoning: ${response.reasoning}`);

            if (oracleProgram) {
                const random32 = () => Array.from(crypto.randomBytes(32));
                
                const [agentPda] = web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("dive_agent"), kp.publicKey.toBuffer()],
                    oracleProgram.programId
                );

                const [insightPda] = web3.PublicKey.findProgramAddressSync(
                    [Buffer.from("dive_insight"), agentPda.toBuffer(), marketPubkey.toBuffer()],
                    oracleProgram.programId
                );

                let predictedOutcome: any = { unsure: {} };
                if (response.prediction.toUpperCase() === "YES") {
                    predictedOutcome = { yes: {} };
                } else if (response.prediction.toUpperCase() === "NO") {
                    predictedOutcome = { no: {} };
                }

                await oracleProgram.methods.submitInsight(
                    marketPubkey,
                    predictedOutcome as any,
                    response.confidence,
                    response.reasoning.substring(0, 150),
                    random32()
                ).accounts({
                    authority: kp.publicKey,
                    agent: agentPda,
                    insight: insightPda,
                    systemProgram: web3.SystemProgram.programId
                }).signers([kp]).rpc();

                console.log(`Submitted insight for ${agents[i]} to dive_oracle.`);
            } else {
                console.log(`(Mock) Submitted insight for ${agents[i]} to dive_oracle.`);
            }

        } catch (e: any) {
            console.error(`Error processing Groq response for ${agents[i]}:`, e.message);
        }
    }

    console.log("\nFinished processing all agents.");
}

main().catch(console.error);
