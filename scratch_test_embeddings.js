import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testEmbedding(modelName) {
  try {
    console.log(`Testing embedding model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent("test string");
    console.log(`✅ Success for ${modelName}! Length: ${result.embedding.values.length}`);
    return true;
  } catch (e) {
    console.error(`❌ Failed for ${modelName}: ${e.message}`);
    return false;
  }
}

async function runTests() {
  const models = [
    "text-embedding-004",
    "gemini-embedding-2",
    "gemini-embedding-2-preview",
    "gemini-embedding-001",
    "models/text-embedding-004",
    "models/gemini-embedding-2"
  ];
  for (const m of models) {
    await testEmbedding(m);
  }
}

runTests();
