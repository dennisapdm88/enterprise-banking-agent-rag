import type { AgentState, AgentUpdate } from "../state.js";

export async function riskAgent(state: AgentState): Promise<AgentUpdate> {
  const requestedAmount = Number(String(state.extractedDetails?.requestedAmount ?? "0").replace(/,/g, ""));
  const creditScore = Math.max(300, Math.min(850, 680 + (Math.round((state.documentContext?.length ?? 0) / 25) % 100)));

  return {
    creditScore,
    status: requestedAmount > 10000 ? "pending_human_review" : "approved",
  };
}
