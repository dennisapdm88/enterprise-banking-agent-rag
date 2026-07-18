import type { AgentState, AgentUpdate } from "../state.js";

export async function extractorAgent(state: AgentState): Promise<AgentUpdate> {
  const prompt = state.rawPrompt ?? "";
  const amountMatch = prompt.match(/\$?([0-9,]+(?:\.[0-9]{1,2})?)/);
  const incomeMatch = prompt.match(/income[^0-9$]*\$?([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const nameMatch = prompt.match(/name[^a-zA-Z]*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);

  return {
    extractedDetails: {
      name: nameMatch?.[1] ?? "Unknown Applicant",
      requestedAmount: amountMatch?.[1] ?? "0",
      income: incomeMatch?.[1] ?? "0",
    },
    status: "extracted",
  };
}
