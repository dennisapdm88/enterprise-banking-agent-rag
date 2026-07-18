import { buildGraph, createWorkflowState } from "./graph.js";
import { clearVectorStore, ingestDocument } from "./vectorStore.js";

async function main(): Promise<void> {
  clearVectorStore();

  await ingestDocument({
    id: "sample-financial-statement",
    text: "Revenue increased by 18 percent year over year. Cash reserves remain strong. Debt to equity is stable and operating margins improved.",
  });

  const graph = buildGraph();
  const initialState = createWorkflowState({
    rawPrompt: "Applicant name Jane Doe requests a $12000 loan with income $85000.",
  });

  const result = await graph.invoke(initialState);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
