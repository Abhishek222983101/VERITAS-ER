"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestions = getQuestions;
exports.getQuestion = getQuestion;
exports.addQuestion = addQuestion;
exports.updateQuestion = updateQuestion;
exports.getAgents = getAgents;
exports.getAgent = getAgent;
exports.addAgent = addAgent;
exports.updateAgent = updateAgent;
exports.getVotes = getVotes;
exports.addVote = addVote;
exports.getCommittee = getCommittee;
exports.addCommitteeMember = addCommitteeMember;
exports.getAttestation = getAttestation;
exports.addAttestation = addAttestation;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const DB_FILE = path_1.default.join(DATA_DIR, 'db.json');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
let db = {
    questions: [],
    agents: [],
    votes: [],
    committee: [],
    attestations: []
};
// Load existing data
if (fs_1.default.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf8'));
    }
    catch {
        // ignore parse errors
    }
}
function save() {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function getQuestions() {
    return [...db.questions].sort((a, b) => b.created_at - a.created_at);
}
function getQuestion(questionId) {
    return db.questions.find(q => q.question_id === questionId);
}
function addQuestion(question) {
    db.questions.push({
        ...question,
        created_at: Date.now(),
        id: db.questions.length + 1
    });
    save();
    return question;
}
function updateQuestion(questionId, updates) {
    const idx = db.questions.findIndex(q => q.question_id === questionId);
    if (idx >= 0) {
        db.questions[idx] = { ...db.questions[idx], ...updates };
        save();
    }
}
function getAgents() {
    return [...db.agents].sort((a, b) => b.reputation - a.reputation);
}
function getAgent(wallet) {
    return db.agents.find(a => a.wallet_pubkey === wallet);
}
function addAgent(agent) {
    db.agents.push({
        ...agent,
        created_at: Date.now(),
        id: db.agents.length + 1,
        reputation: agent.reputation || 500,
        total_votes: 0,
        correct_votes: 0
    });
    save();
    return agent;
}
function updateAgent(wallet, updates) {
    const idx = db.agents.findIndex(a => a.wallet_pubkey === wallet);
    if (idx >= 0) {
        db.agents[idx] = { ...db.agents[idx], ...updates };
        save();
    }
}
function getVotes(questionId) {
    return db.votes.filter(v => v.question_id === questionId);
}
function addVote(vote) {
    db.votes.push({
        ...vote,
        created_at: Date.now(),
        id: db.votes.length + 1
    });
    save();
    return vote;
}
function getCommittee(questionId) {
    return db.committee.filter(c => c.question_id === questionId);
}
function addCommitteeMember(questionId, agentWallet) {
    const exists = db.committee.find(c => c.question_id === questionId && c.agent_wallet === agentWallet);
    if (!exists) {
        db.committee.push({
            question_id: questionId,
            agent_wallet: agentWallet,
            selected_at: Date.now()
        });
        save();
    }
}
function getAttestation(wallet) {
    return db.attestations.find(a => a.wallet_pubkey === wallet);
}
function addAttestation(attestation) {
    db.attestations.push({
        ...attestation,
        created_at: Date.now()
    });
    save();
    return attestation;
}
exports.default = db;
