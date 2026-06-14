import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  try {
    console.log(`Testing model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello");
    console.log(`✅ Success for ${modelName}! Response: ${result.response.text().trim()}`);
    return true;
  } catch (e) {
    console.error(`❌ Failed for ${modelName}: ${e.message}`);
    return false;
  }
}

async function runTests() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite"
  ];
  for (const m of models) {
    await testModel(m);
  }
}

runTests();
