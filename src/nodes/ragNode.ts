import type { AgentState, AgentUpdate } from "../state.js";
import { searchDocuments } from "../vectorStore.js";

export async function ragNode(state: AgentState): Promise<AgentUpdate> {
  const results = await searchDocuments(state.rawPrompt ?? "");
  return {
    documentContext: results.map((item) => item.content).join("\n\n"),
  };
}
