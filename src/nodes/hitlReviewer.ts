import type { AgentState, AgentUpdate } from "../state.js";

export async function hitlReviewer(state: AgentState): Promise<AgentUpdate> {
  const humanApproval = state.humanApproval ?? "pending";

  return {
    humanApproval,
    status: humanApproval === "yes" ? "completed" : "failed",
  };
}
