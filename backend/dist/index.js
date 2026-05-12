"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3001;
// Questions
app.get('/api/questions', (req, res) => {
    try {
        const questions = (0, db_1.getQuestions)();
        res.json({ success: true, data: questions });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.get('/api/questions/:questionId', (req, res) => {
    try {
        const question = (0, db_1.getQuestion)(parseInt(req.params.questionId));
        if (!question) {
            return res.status(404).json({ success: false, error: 'Question not found' });
        }
        res.json({ success: true, data: question });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/questions', (req, res) => {
    try {
        const question = (0, db_1.addQuestion)(req.body);
        res.json({ success: true, data: question });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.patch('/api/questions/:questionId', (req, res) => {
    try {
        (0, db_1.updateQuestion)(parseInt(req.params.questionId), req.body);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Agents
app.get('/api/agents', (req, res) => {
    try {
        const agents = (0, db_1.getAgents)();
        res.json({ success: true, data: agents });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.get('/api/agents/:wallet', (req, res) => {
    try {
        const agent = (0, db_1.getAgent)(req.params.wallet);
        if (!agent) {
            return res.status(404).json({ success: false, error: 'Agent not found' });
        }
        res.json({ success: true, data: agent });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/agents', (req, res) => {
    try {
        const agent = (0, db_1.addAgent)(req.body);
        res.json({ success: true, data: agent });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.patch('/api/agents/:wallet', (req, res) => {
    try {
        (0, db_1.updateAgent)(req.params.wallet, req.body);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Votes
app.get('/api/votes/:questionId', (req, res) => {
    try {
        const votes = (0, db_1.getVotes)(parseInt(req.params.questionId));
        res.json({ success: true, data: votes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/votes', (req, res) => {
    try {
        const vote = (0, db_1.addVote)(req.body);
        res.json({ success: true, data: vote });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Committee
app.get('/api/committee/:questionId', (req, res) => {
    try {
        const committee = (0, db_1.getCommittee)(parseInt(req.params.questionId));
        res.json({ success: true, data: committee });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/committee', (req, res) => {
    try {
        const { question_id, agent_wallet } = req.body;
        (0, db_1.addCommitteeMember)(question_id, agent_wallet);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Attestations
app.get('/api/attestations/:wallet', (req, res) => {
    try {
        const attestation = (0, db_1.getAttestation)(req.params.wallet);
        res.json({ success: true, data: attestation });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/attestations', (req, res) => {
    try {
        const attestation = (0, db_1.addAttestation)(req.body);
        res.json({ success: true, data: attestation });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Private Payments proxy
app.post('/api/private-payments/deposit', async (req, res) => {
    try {
        const ppRes = await fetch('https://private-payments.magicblock.app/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await ppRes.json();
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.get('/api/private-payments/config', async (req, res) => {
    try {
        const ppRes = await fetch('https://private-payments.magicblock.app/getConfig');
        const data = await ppRes.json();
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/private-payments/transfer', async (req, res) => {
    try {
        const ppRes = await fetch('https://private-payments.magicblock.app/transferAmount', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await ppRes.json();
        res.json({ success: true, data });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/tee/auth-token', async (req, res) => {
    try {
        const { teeUrl, publicKey } = req.body;
        res.json({ success: true, message: 'Use client-side getAuthToken with wallet signMessage', teeUrl, publicKey });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
app.listen(PORT, () => {
    console.log(`VERITAS Backend API running on port ${PORT}`);
    console.log(`Data file: ${process.cwd()}/data/db.json`);
});
