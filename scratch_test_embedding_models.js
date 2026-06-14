import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function testEmbeddingModels() {
  const modelsToTest = [
    { name: "text-embedding-004", version: undefined },
    { name: "text-embedding-004", version: "v1" },
    { name: "embedding-001", version: undefined },
    { name: "embedding-001", version: "v1" }
  ];

  for (const item of modelsToTest) {
    try {
      console.log(`Testing model ${item.name} with apiVersion ${item.version}...`);
      const options = item.version ? { apiVersion: item.version } : undefined;
      const genAI = new GoogleGenerativeAI(apiKey, options);
      const model = genAI.getGenerativeModel({ model: item.name });
      const result = await model.embedContent("hello world");
      console.log(`✅ Success for ${item.name} (${item.version || 'default'}): dimensions = ${result.embedding.values.length}`);
    } catch (e) {
      console.log(`❌ Failed for ${item.name} (${item.version || 'default'}): ${e.message}`);
    }
  }
}

testEmbeddingModels();
