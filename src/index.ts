import { config as loadEnv } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { PDFParse } from "pdf-parse";
import { buildGraph, createWorkflowState } from "./graph.js";
import { clearVectorStore, ingestDocument } from "./vectorStore.js";

loadEnv();
if (!process.env.OPENAI_API_KEY) {
  loadEnv({ path: ".env.example" });
}

const DEFAULT_LOAN_PROMPT = "Applicant name Jane Doe requests a $12000 loan with income $85000.";
const DEFAULT_CONTEXT_FILE = "docs/Loan-report.pdf";


async function main(): Promise<void> {
  clearVectorStore();

  const contextDocument = await loadContextDocument();

  await ingestDocument({
    id: contextDocument.id,
    text: contextDocument.text,
  });

  const graph = buildGraph();
  const initialState = createWorkflowState({
    rawPrompt: process.env.LOAN_PROMPT ?? DEFAULT_LOAN_PROMPT,
  });

  const result = await graph.invoke(initialState);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
})

async function loadContextDocument(): Promise<{ id: string; text: string }> {
  const configuredPath = process.env.LOAN_CONTEXT_FILE ?? DEFAULT_CONTEXT_FILE;
  const contextFilePath = await resolveContextFilePath(configuredPath);

  try {
    const fileContent = await readTextFromFile(contextFilePath);
    const trimmed = fileContent.trim();
    if (!trimmed) {
      throw new Error("Context document is empty");
    }

    return {
      id: basename(contextFilePath),
      text: trimmed,
    };
  } catch (error) {
    throw new Error(`[index] Could not read context document at ${configuredPath}: ${String(error)}`);
  }
}

async function resolveContextFilePath(configuredPath: string): Promise<string> {
  const absolutePath = resolve(process.cwd(), configuredPath);

  try {
    await readFile(absolutePath);
    return absolutePath;
  } catch {
    const docsDir = resolve(process.cwd(), "docs");
    const files = await readdir(docsDir);
    const firstPdf = files.find((fileName) => fileName.trim().toLowerCase().endsWith(".pdf"));

    if (!firstPdf) {
      return absolutePath;
    }

    const discoveredPath = resolve(docsDir, firstPdf);
    console.info(`[index] Using discovered context file: docs/${firstPdf}`);
    return discoveredPath;
  }
}

async function readTextFromFile(filePath: string): Promise<string> {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    const fileBuffer = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });

    try {
      const parsed = await parser.getText();
      return parsed.text;
    } finally {
      await parser.destroy();
    }
  }

  return readFile(filePath, "utf-8");
};

