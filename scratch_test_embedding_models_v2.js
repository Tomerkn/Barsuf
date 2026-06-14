import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testEmbeddingModels() {
  const modelsToTest = [
    "gemini-embedding-2",
    "gemini-embedding-001"
  ];

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing model ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const start = Date.now();
      const result = await model.embedContent("hello world");
      console.log(`✅ Success for ${modelName}: dimensions = ${result.embedding.values.length} in ${Date.now() - start}ms`);
    } catch (e) {
      console.log(`❌ Failed for ${modelName}: ${e.message}`);
    }
  }
}

testEmbeddingModels();
