"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.researchQuestion = researchQuestion;
const agents_1 = require("./agents");
async function researchQuestion(agentKey, questionText, category, groqApiKey, mistralApiKey) {
    const agent = agents_1.AGENTS[agentKey];
    if (!agent)
        throw new Error(`Unknown agent: ${agentKey}`);
    const defaultResult = {
        vote: 2,
        confidence: 30,
        reasoning: "API unavailable - defaulting to UNSURE",
        evidenceHash: new Array(32).fill(0),
    };
    const prompt = `QUESTION: ${questionText}\nCATEGORY: ${category}\n\nEvaluate this question and provide your vote.`;
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
                    max_tokens: 200,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || "";
                const parsed = (0, agents_1.parseLLMResponse)(content);
                const encoder = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(parsed.reasoning));
                const evidenceHash = Array.from(new Uint8Array(hashBuffer));
                console.log(`[${agent.name}] Vote: ${["YES", "NO", "UNSURE"][parsed.vote]} (${parsed.confidence}%) — ${parsed.reasoning}`);
                return { ...parsed, evidenceHash };
            }
            console.error(`Groq API error for ${agent.name}: ${response.status}`);
        }
        catch (err) {
            console.error(`Groq error for ${agent.name}: ${err.message}`);
        }
    }
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
                    max_tokens: 200,
                }),
            });
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || "";
                const parsed = (0, agents_1.parseLLMResponse)(content);
                const encoder = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(parsed.reasoning));
                const evidenceHash = Array.from(new Uint8Array(hashBuffer));
                console.log(`[${agent.name}] Vote: ${["YES", "NO", "UNSURE"][parsed.vote]} (${parsed.confidence}%) — ${parsed.reasoning}`);
                return { ...parsed, evidenceHash };
            }
            console.error(`Mistral API error for ${agent.name}: ${response.status}`);
        }
        catch (err) {
            console.error(`Mistral error for ${agent.name}: ${err.message}`);
        }
    }
    console.log(`[${agent.name}] All APIs failed — defaulting to UNSURE`);
    return defaultResult;
}
