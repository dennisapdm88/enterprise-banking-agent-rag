import type { AgentState, AgentUpdate } from "../state.js";
import { searchDocuments } from "../vectorStore.js";

export async function ragNode(state: AgentState): Promise<AgentUpdate> {
  const topK = Number.parseInt(process.env.RAG_TOP_K ?? "10", 10);
  const results = await searchDocuments(state.rawPrompt ?? "", Number.isFinite(topK) ? Math.max(topK, 1) : 10);
  return {
    documentContext: results.map((item) => item.content).join("\n\n"),
  };
}
