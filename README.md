# Enterprise Banking Agent RAG

A production-ready **Remote Loan Approval Multi-Agent System** built with modern ES Modules, TypeScript, and LangGraph.js. This project demonstrates enterprise-grade AI patterns: Multi-Agent Orchestration, Semantic RAG pipeline with Vector storage, and Human-in-the-Loop (HITL) checkpoints.

## 🏗️ System Architecture

```
Document Ingestion
       ↓
Text Chunking & Vectorization (OpenAI Embeddings)
       ↓
In-Memory Vector Database
       ↓
User Prompt (Loan Request)
       ↓
RAG Retrieval Node (Semantic Search)
       ↓
Agent A: Extractor (Parse Name, Amount, Income)
       ↓
Agent B: Risk Agent (Credit Score & Rule Evaluation)
       ↓
[Decision: Amount > $10,000?]
       ├─→ YES: HITL Checkpoint (Pause & Await Approval)
       └─→ NO: Final Settlement (Execute)
```

## 🎯 Core Capabilities

### 1. **Multi-Agent Orchestration** (LangGraph StateGraph)
- **Agent A (Extractor)**: Parses unstructured customer loan application text, extracts Name, Requested Amount, and Income
- **Agent B (Risk/Credit Agent)**: Evaluates applicant risk, computes credit score, enforces lending rules (loans > $10K require human review)
- Global state tracking via `AgentState` with: `rawPrompt`, `extractedDetails`, `creditScore`, `documentContext`, `status`, `humanApproval`

### 2. **Semantic RAG Pipeline** (Vector-Based Document Retrieval)
- **Text Chunking**: Overlapping chunks (400 chars, 80 char overlap) via `RecursiveCharacterTextSplitter`
- **Vectorization**: OpenAI `text-embedding-3-small` model for semantic embeddings
- **Vector Store**: Custom `SimpleMemoryVectorStore` extending LangChain's `VectorStore` base class
  - Stores embeddings in document metadata
  - Performs cosine similarity search
  - In-memory (no external DB required)
- **Retrieval Node**: Injects top-K matching financial documents into the workflow state

### 3. **Human-in-the-Loop (HITL) Checkpoint** (LangGraph Interrupts)
- If loan amount > $10,000 → application pauses at `HumanReviewNode`
- System serializes execution state to memory
- Exposes deterministic resume hook accepting `{ humanApproval: 'yes' | 'no' }`
- Upon resume: transitions to `completed` or `failed`, executes final settlement API call

## 📦 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Orchestration** | `@langchain/langgraph` | State-based workflow graph execution |
| **LLM Integration** | `@langchain/openai` | GPT-based extraction & embeddings |
| **Vector Store** | Custom `SimpleMemoryVectorStore` | Semantic document retrieval |
| **Text Processing** | `@langchain/textsplitters` | Document chunking |
| **Document Parsing** | `pdf-parse` | PDF ingestion & text extraction |
| **Runtime** | `Node.js 20+` (ESM) | ES Modules for production code |
| **Type Safety** | `TypeScript 5.7` | Full type coverage |
| **Build** | `tsc` | TypeScript compilation |

### Dependencies

```json
{
  "@langchain/core": "^0.3.0",
  "@langchain/langgraph": "^0.2.0",
  "@langchain/openai": "^0.3.17",
  "@langchain/textsplitters": "^0.1.0",
  "pdf-parse": "^2.4.5",
  "dotenv": "^16.6.1"
}
```

## 📁 Project Structure

```
├── src/
│   ├── index.ts                 # Entry point - orchestrates RAG ingestion & graph execution
│   ├── state.ts                 # AgentState TypeAnnotation & schema definitions
│   ├── graph.ts                 # StateGraph topology, conditional routing, checkpointer
│   ├── vectorStore.ts           # SimpleMemoryVectorStore implementation (RAG Core)
│   │                             # - Text chunking
│   │                             # - Embedding generation
│   │                             # - Semantic search logic
│   └── nodes/
│       ├── extractorAgent.ts    # Agent A - LLM-based text parser
│       ├── riskAgent.ts         # Agent B - Credit evaluation & rule enforcement
│       ├── ragNode.ts           # RAG semantic retrieval connector
│       ├── hitlReviewer.ts      # HITL interrupt & resume checkpoint
│       └── finalSettlement.ts   # Mock banking API executor
├── docs/
│   └── Loan-report.pdf          # Sample financial document for RAG
├── dist/                        # Compiled JavaScript (generated)
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── Dockerfile                   # Multi-stage production build
└── .env.example                 # Environment variable template
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+ (ESM support)
- **npm** 10+
- **OpenAI API Key** (for embeddings & LLM)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd enterprise-banking-agent-rag

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env

# Add your OpenAI API key
# Edit .env and set OPENAI_API_KEY=sk-...
```

### Environment Variables

```bash
OPENAI_API_KEY=sk-...                          # Required for embeddings & LLM
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Default embedding model
LOAN_PROMPT="..."                               # Custom loan application (optional)
RAG_TOP_K=10                                    # Number of RAG results to retrieve
```

### Running the Project

**Development Mode:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

**TypeScript Check:**
```bash
npm run typecheck
```

## 📊 Sample Workflow Output

```json
{
  "rawPrompt": "Applicant name Jane Doe requests a $12000 loan with income $85000.",
  "extractedDetails": {
    "name": "Jane Doe",
    "requestedAmount": "12000",
    "income": "85000"
  },
  "creditScore": 752,
  "documentContext": "[Retrieved financial context from RAG...]",
  "status": "pending_human_review",
  "humanApproval": "pending",
  "settlementResult": {
    "applicant": "Jane Doe",
    "status": "failed",
    "settledAt": "2026-07-19T14:23:30.134Z"
  }
}
```

## 🔑 Key Design Patterns

### 1. **SimpleMemoryVectorStore** (Custom LangChain Extension)
```typescript
class SimpleMemoryVectorStore extends VectorStore {
  // Stores documents with embeddings in metadata
  // Performs cosine similarity search
  // Implements LangChain's VectorStore interface
}
```

**Why extend VectorStore?**
- Type compatibility with LangChain ecosystem
- Future-proof for component integrations
- Follows LangChain design patterns
- Enforces interface contract at compile-time

### 2. **Stateful Graph Execution** (LangGraph)
- Documents are chunked & vectorized on startup
- Graph maintains shared state across agent nodes
- Conditional routing: `amount > $10K` → HITL checkpoint
- Interrupt point for human review before settlement

### 3. **Vector Search Integration**
- RAG node retrieves top-K documents via semantic similarity
- Context injected into agent state for context-aware decisions
- Cosine similarity scoring for relevance ranking

## 🔒 Security Considerations

- ✅ API keys stored in `.env` (not committed)
- ✅ HITL checkpoint prevents unauthorized high-value transactions
- ✅ In-memory storage (no persistent data leakage)
- ✅ PDF sanitization removes noise (page numbers, headers)

## 📈 Performance Notes

- **Embeddings**: Cached per document chunk
- **Vector Search**: O(n) similarity scoring (in-memory)
- **Token Usage**: Estimated & logged per ingestion
- **Scalability**: For production, replace SimpleMemoryVectorStore with Pinecone, Weaviate, or Milvus

## 🐳 Docker Support

```bash
# Build production image
docker build -t banking-agent .

# Run container
docker run --env OPENAI_API_KEY=sk-... banking-agent
```

## 📝 Example Loan Request

```typescript
const loanApplication = `
  Applicant name Jane Doe requests a $12000 loan with income $85000.
`;

// Graph automatically:
// 1. Extracts: { name: "Jane Doe", amount: 12000, income: 85000 }
// 2. Retrieves RAG context from financial documents
// 3. Evaluates credit risk (score: 752)
// 4. Pauses at HITL checkpoint (amount > $10K)
// 5. Awaits human approval resume
```

## 🔄 State Flow

```
Initial State
    ↓
RAG Node: Retrieve Context
    ↓
Extractor Agent: Parse Details
    ↓
Risk Agent: Evaluate Credit
    ↓
[Status Check]
    ├─→ < $10K: Auto-approved → Settlement
    └─→ ≥ $10K: HITL Interrupt → (await human input) → Settlement
```

## 🧪 Testing

Currently, the project executes an end-to-end workflow with sample loan data. For production:
- Add unit tests for agent logic
- Mock LLM responses for deterministic testing
- Add integration tests for graph execution
- Validate PDF parsing with various document formats

## 📚 Resources

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [LangChain.js Docs](https://js.langchain.com/)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [VectorStore Design](https://js.langchain.com/docs/modules/data_connection/vectorstores/)

## 📄 License

MIT

## 👤 Author

Enterprise Banking Agent RAG - Production-Ready Multi-Agent System with RAG & HITL

---

**Last Updated:** July 19, 2026  
**Status:** ✅ Fully Functional - Ready for Enterprise Deployment
