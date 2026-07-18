import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
}

export interface SearchResult extends VectorDocument {
  score: number;
}

interface IngestDocumentInput {
  id: string;
  text: string;
}

const documents: VectorDocument[] = [];
let embeddingsClient: OpenAIEmbeddings | null = null;

export async function chunkText(text: string, size = 500, overlap = 80): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: size,
    chunkOverlap: overlap,
  });
  return splitter.splitText(text);
}

export async function ingestDocument({ id, text }: IngestDocumentInput): Promise<VectorDocument[]> {
  const chunks = await chunkText(text);
  const embeddings = await embedDocuments(chunks);

  const indexedChunks = chunks.map((content, index) => ({
    id: `${id}-${index}`,
    content,
    embedding: embeddings[index],
  }));

  console.info(
    `[vectorStore] indexed=${indexedChunks.length} approx_tokens=${estimateTokenUsage(chunks.join(" "))} provider=${getEmbeddingProvider()}`
  );

  documents.push(...indexedChunks);
  return indexedChunks;
}

export async function searchDocuments(query: string, limit = 3): Promise<SearchResult[]> {
  const queryVector = await embedQuery(query);

  return documents
    .map((item) => ({
      ...item,
      score: cosineSimilarity(queryVector, item.embedding),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function clearVectorStore(): void {
  documents.length = 0;
}

function getEmbeddingProvider(): "openai" | "local-fallback" {
  return process.env.OPENAI_API_KEY ? "openai" : "local-fallback";
}

function getEmbeddingsClient(): OpenAIEmbeddings | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!embeddingsClient) {
    embeddingsClient = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
    });
  }

  return embeddingsClient;
}

async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = getEmbeddingsClient();
  if (!client) {
    return texts.map((text) => fakeEmbedding(text));
  }

  try {
    const vectors = await client.embedDocuments(texts);
    return vectors;
  } catch (error) {
    console.warn("[vectorStore] OpenAI embedDocuments failed, using local fallback.", error);
    return texts.map((text) => fakeEmbedding(text));
  }
}

async function embedQuery(text: string): Promise<number[]> {
  const client = getEmbeddingsClient();
  if (!client) {
    return fakeEmbedding(text);
  }

  try {
    return await client.embedQuery(text);
  } catch (error) {
    console.warn("[vectorStore] OpenAI embedQuery failed, using local fallback.", error);
    return fakeEmbedding(text);
  }
}

function estimateTokenUsage(text: string): number {
  return Math.ceil(text.length / 4);
}

function fakeEmbedding(text: string): number[] {
  const vector = new Array<number>(16).fill(0);
  for (let index = 0; index < text.length; index += 1) {
    vector[index % vector.length] += text.charCodeAt(index) / 255;
  }
  return vector;
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
