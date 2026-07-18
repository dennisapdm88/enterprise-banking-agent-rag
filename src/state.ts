export type LoanStatus =
  | "idle"
  | "extracted"
  | "approved"
  | "pending_human_review"
  | "completed"
  | "failed";

export type HumanApproval = "yes" | "no" | "pending" | null;

export interface ExtractedDetails {
  name: string;
  requestedAmount: string;
  income: string;
}

export interface SettlementResult {
  applicant: string;
  status: LoanStatus;
  settledAt: string;
}

export interface AgentState {
  rawPrompt: string;
  extractedDetails: ExtractedDetails;
  creditScore: number;
  documentContext: string;
  status: LoanStatus;
  humanApproval: HumanApproval;
  settlementResult: SettlementResult | null;
}

export type AgentUpdate = Partial<AgentState>;

export const initialAgentState: AgentState = {
  rawPrompt: "",
  extractedDetails: {
    name: "",
    requestedAmount: "0",
    income: "0",
  },
  creditScore: 0,
  documentContext: "",
  status: "idle",
  humanApproval: null,
  settlementResult: null,
};

export function createInitialState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    ...initialAgentState,
    ...overrides,
    extractedDetails: {
      ...initialAgentState.extractedDetails,
      ...overrides.extractedDetails,
    },
  };
}
