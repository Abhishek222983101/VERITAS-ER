const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchQuestions() {
  const res = await fetch(`${API_BASE}/questions`);
  const data = await res.json();
  return data.success ? data.data : [];
}

export async function fetchQuestion(questionId: number) {
  const res = await fetch(`${API_BASE}/questions/${questionId}`);
  const data = await res.json();
  return data.success ? data.data : null;
}

export async function createQuestion(questionData: any) {
  const res = await fetch(`${API_BASE}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(questionData),
  });
  return res.json();
}

export async function updateQuestion(questionId: number, updates: any) {
  const res = await fetch(`${API_BASE}/questions/${questionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  const data = await res.json();
  return data.success ? data.data : [];
}

export async function fetchAgent(wallet: string) {
  const res = await fetch(`${API_BASE}/agents/${wallet}`);
  const data = await res.json();
  return data.success ? data.data : null;
}

export async function createAgent(agentData: any) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agentData),
  });
  return res.json();
}

export async function updateAgent(wallet: string, updates: any) {
  const res = await fetch(`${API_BASE}/agents/${wallet}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.json();
}

export async function fetchVotes(questionId: number) {
  const res = await fetch(`${API_BASE}/votes/${questionId}`);
  const data = await res.json();
  return data.success ? data.data : [];
}

export async function createVote(voteData: any) {
  const res = await fetch(`${API_BASE}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(voteData),
  });
  return res.json();
}

export async function fetchCommittee(questionId: number) {
  const res = await fetch(`${API_BASE}/committee/${questionId}`);
  const data = await res.json();
  return data.success ? data.data : [];
}

export async function addCommitteeMember(questionId: number, agentWallet: string) {
  const res = await fetch(`${API_BASE}/committee`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id: questionId, agent_wallet: agentWallet }),
  });
  return res.json();
}

export async function fetchAttestation(wallet: string) {
  const res = await fetch(`${API_BASE}/attestations/${wallet}`);
  const data = await res.json();
  return data.success ? data.data : null;
}

export async function createAttestation(attestationData: any) {
  const res = await fetch(`${API_BASE}/attestations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(attestationData),
  });
  return res.json();
}
