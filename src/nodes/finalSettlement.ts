import type { AgentState, AgentUpdate, LoanStatus } from "../state.js";

function ensureTerminalStatus(status: AgentState["status"]): LoanStatus {
  if (status === "completed" || status === "failed") {
    return status;
  }
  return status === "approved" ? "completed" : "failed";
}

export async function finalSettlement(state: AgentState): Promise<AgentUpdate> {
  const resolvedStatus = ensureTerminalStatus(state.status);

  return {
    status: resolvedStatus,
    settlementResult: {
      applicant: state.extractedDetails?.name ?? "Unknown Applicant",
      status: resolvedStatus,
      settledAt: new Date().toISOString(),
    },
  };
}
