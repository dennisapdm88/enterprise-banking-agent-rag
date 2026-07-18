import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { createInitialState } from "./state.js";
import type { AgentState, ExtractedDetails, HumanApproval, LoanStatus, SettlementResult } from "./state.js";
import { extractorAgent } from "./nodes/extractorAgent.js";
import { riskAgent } from "./nodes/riskAgent.js";
import { ragNode } from "./nodes/ragNode.js";
import { hitlReviewer } from "./nodes/hitlReviewer.js";
import { finalSettlement } from "./nodes/finalSettlement.js";

export function buildGraph() {
  const AgentStateAnnotation = Annotation.Root({
    rawPrompt: Annotation<string>,
    extractedDetails: Annotation<ExtractedDetails>,
    creditScore: Annotation<number>,
    documentContext: Annotation<string>,
    status: Annotation<LoanStatus>,
    humanApproval: Annotation<HumanApproval>,
    settlementResult: Annotation<SettlementResult | null>,
  });

  const graph = new StateGraph(AgentStateAnnotation)
    .addNode("ragNode", ragNode)
    .addNode("extractorAgent", extractorAgent)
    .addNode("riskAgent", riskAgent)
    .addNode("hitlReviewer", hitlReviewer)
    .addNode("finalSettlement", finalSettlement)
    .addEdge(START, "ragNode")
    .addEdge("ragNode", "extractorAgent")
    .addEdge("extractorAgent", "riskAgent")
    .addConditionalEdges("riskAgent", (state: AgentState) =>
      state.status === "pending_human_review" ? "hitlReviewer" : "finalSettlement"
    )
    .addEdge("hitlReviewer", "finalSettlement")
    .addEdge("finalSettlement", END);

  return graph.compile();
}

export function createWorkflowState(overrides: Partial<AgentState> = {}): AgentState {
  return createInitialState(overrides);
}
