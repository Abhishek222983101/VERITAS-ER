import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DBSchema {
  questions: any[];
  agents: any[];
  votes: any[];
  committee: any[];
  attestations: any[];
}

let db: DBSchema = {
  questions: [],
  agents: [],
  votes: [],
  committee: [],
  attestations: []
};

// Load existing data
if (fs.existsSync(DB_FILE)) {
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    // ignore parse errors
  }
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export function getQuestions() {
  return [...db.questions].sort((a, b) => b.created_at - a.created_at);
}

export function getQuestion(questionId: number) {
  return db.questions.find(q => q.question_id === questionId);
}

export function addQuestion(question: any) {
  db.questions.push({
    ...question,
    created_at: Date.now(),
    id: db.questions.length + 1
  });
  save();
  return question;
}

export function updateQuestion(questionId: number, updates: any) {
  const idx = db.questions.findIndex(q => q.question_id === questionId);
  if (idx >= 0) {
    db.questions[idx] = { ...db.questions[idx], ...updates };
    save();
  }
}

export function getAgents() {
  return [...db.agents].sort((a, b) => b.reputation - a.reputation);
}

export function getAgent(wallet: string) {
  return db.agents.find(a => a.wallet_pubkey === wallet);
}

export function addAgent(agent: any) {
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

export function updateAgent(wallet: string, updates: any) {
  const idx = db.agents.findIndex(a => a.wallet_pubkey === wallet);
  if (idx >= 0) {
    db.agents[idx] = { ...db.agents[idx], ...updates };
    save();
  }
}

export function getVotes(questionId: number) {
  return db.votes.filter(v => v.question_id === questionId);
}

export function addVote(vote: any) {
  db.votes.push({
    ...vote,
    created_at: Date.now(),
    id: db.votes.length + 1
  });
  save();
  return vote;
}

export function getCommittee(questionId: number) {
  return db.committee.filter(c => c.question_id === questionId);
}

export function addCommitteeMember(questionId: number, agentWallet: string) {
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

export function getAttestation(wallet: string) {
  return db.attestations.find(a => a.wallet_pubkey === wallet);
}

export function addAttestation(attestation: any) {
  db.attestations.push({
    ...attestation,
    created_at: Date.now()
  });
  save();
  return attestation;
}

export default db;
