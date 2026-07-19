import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { VectorStore } from "@langchain/core/vectorstores";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";
import type { Document } from "@langchain/core/documents";

export interface VectorDocument {
  id: string;
  content: string;
}

export interface SearchResult extends VectorDocument {
  score: number;
}

interface IngestDocumentInput {
  id: string;
  text: string;
}

/**
 * Simple in-memory vector store implementation using LangChain's VectorStore base
 */
class SimpleMemoryVectorStore extends VectorStore {
  _vectorstoreType() {
    return "simple-memory";
  }

  documents: Document[] = [];

  constructor(embeddings: EmbeddingsInterface) {
    super(embeddings, {});
  }

  async addDocuments(docs: Document[]): Promise<void> {
    this.documents.push(...docs);
  }

  async similaritySearchWithScore(query: string, k = 3): Promise<[Document, number][]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    
    const results = this.documents.map((doc) => {
      const docEmbedding = (doc.metadata?.embedding as number[]) || [];
      const score = cosineSimilarity(queryEmbedding, docEmbedding);
      return [doc, score] as [Document, number];
    });

    return results.sort((a, b) => b[1] - a[1]).slice(0, k);
  }

  async similaritySearchVectorWithScore(): Promise<[Document, number][]> {
    // Not implemented - we use similaritySearchWithScore instead
    return [];
  }

  async addVectors(): Promise<void> {
    // Not needed for our implementation
  }

  async delete(): Promise<void> {
    // Not needed for our implementation
  }
}

let vectorStore: SimpleMemoryVectorStore | null = null;
let embeddingsClient: OpenAIEmbeddings | null = null;

export async function chunkText(text: string, size = 400, overlap = 80): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: size,
    chunkOverlap: overlap,
  });
  return splitter.splitText(text);
}

async function getOrCreateVectorStore(): Promise<SimpleMemoryVectorStore> {
  if (vectorStore) {
    return vectorStore;
  }

  const embeddings = getEmbeddingsClient();
  vectorStore = new SimpleMemoryVectorStore(embeddings);
  return vectorStore;
}

export async function ingestDocument({ id, text }: IngestDocumentInput): Promise<VectorDocument[]> {
  const cleanedText = sanitizeDocumentText(text);
  const chunks = await chunkText(cleanedText);

  // Get embeddings for each chunk
  const embeddings = await getEmbeddingsClient().embedDocuments(chunks);

  const store = await getOrCreateVectorStore();
  const documents = chunks.map((content, index) => ({
    pageContent: content,
    metadata: {
      id: `${id}-${index}`,
      source: id,
      embedding: embeddings[index], // Store embedding in metadata
    },
  }));

  await store.addDocuments(documents);

  const indexedChunks = chunks.map((content, index) => ({
    id: `${id}-${index}`,
    content,
  }));

  console.info(
    `[vectorStore] indexed=${indexedChunks.length} approx_tokens=${estimateTokenUsage(chunks.join(" "))} provider=${getEmbeddingProvider()}`
  );

  return indexedChunks;
}

export async function searchDocuments(query: string, limit = 3): Promise<SearchResult[]> {
  if (!vectorStore) {
    console.warn("[vectorStore] Vector store not initialized. No documents have been ingested yet.");
    return [];
  }

  try {
    const results = await vectorStore.similaritySearchWithScore(query, limit);
    return results.map(([doc, score]: [any, number]) => ({
      id: doc.metadata?.id ?? "unknown",
      content: doc.pageContent,
      score,
    }));
  } catch (error) {
    console.error("[vectorStore] Search failed:", error);
    return [];
  }
}

export function clearVectorStore(): void {
  vectorStore = null;
}

function getEmbeddingProvider(): "openai" | "local-fallback" {
  return process.env.OPENAI_API_KEY ? "openai" : "local-fallback";
}

function getEmbeddingsClient(): OpenAIEmbeddings {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "[vectorStore] OPENAI_API_KEY is required to use MemoryVectorStore. Please set it in your .env file."
    );
  }

  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    });
  }

  return embeddingsClient;
}

function estimateTokenUsage(text: string): number {
  return Math.ceil(text.length / 4);
}

function sanitizeDocumentText(text: string): string {
  const lines = text.split(/\r?\n/);
  const filtered = lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line))
    .filter((line) => !/^\d+$/.test(line))
    .filter((line) => !/^(tap or click to|monthly\s+report|financial\s+report)$/i.test(line))
    .filter((line) => !/page layout documents|template chooser|document body/i.test(line));

  const cleaned = filtered.join("\n");
  return cleaned.trim().length > 0 ? cleaned : text;
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  const sharedLength = Math.min(left.length, right.length);

  for (let index = 0; index < sharedLength; index += 1) {
    dot += left[index] * right[index];
  }

  for (let index = 0; index < left.length; index += 1) {
    leftMagnitude += left[index] * left[index];
  }

  for (let index = 0; index < right.length; index += 1) {
    rightMagnitude += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}
