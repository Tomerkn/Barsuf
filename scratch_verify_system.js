import { ingestDocument, askQuestion, analyzeTender } from './server/ai.js';
import dotenv from 'dotenv';
dotenv.config();

async function runVerification() {
  console.log("🚀 Starting verification of optimized Gemini systems...");

  const testFile = "./test_tender.pdf";
  const projectId = "tender-test-123";

  // Test 1: Ingest document
  console.log("\n--- Test 1: Document Ingestion (RAG) ---");
  const startIngest = Date.now();
  const ingestSuccess = await ingestDocument(projectId, testFile);
  console.log(`Ingest Completed: ${ingestSuccess ? "✅ SUCCESS" : "❌ FAILED"} in ${Date.now() - startIngest}ms`);

  // Test 2: Ask question (semantic search + RAG query)
  console.log("\n--- Test 2: askQuestion ---");
  const startQuestion = Date.now();
  try {
    const answer = await askQuestion(projectId, "What is the content of this tender?");
    console.log(`✅ Success! Response:\n${answer}\nQuery duration: ${Date.now() - startQuestion}ms`);
  } catch (err) {
    console.error(`❌ Failed askQuestion: ${err.message}`);
  }

  // Test 3: analyzeTender
  console.log("\n--- Test 3: analyzeTender ---");
  const startAnalyze = Date.now();
  try {
    const result = await analyzeTender(testFile, null, (quickAnalysis) => {
      console.log(`⚡ Phase 1 completed! Quick summary preview:\n${quickAnalysis.slice(0, 150)}...\n`);
    });
    console.log(`✅ Success! Phase 2 deep analysis complete. Output preview:\n${result.analysis.slice(0, 150)}...\nBoQ JSON exists: ${!!result.boq_json}`);
    console.log(`Total analysis duration: ${Date.now() - startAnalyze}ms`);
  } catch (err) {
    console.error(`❌ Failed analyzeTender: ${err.message}`);
  }
}

runVerification();
