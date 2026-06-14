import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // We can list models using genAI
    console.log("Listing models using GoogleGenerativeAI...");
    // The SDK might not have a direct listModels helper on genAI, but we can fetch it via fetch or standard REST API
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.models) {
      console.log("Allowed Models:");
      data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
    } else {
      console.log("No models returned:", data);
    }
  } catch (e) {
    console.error("Failed to list models:", e);
  }
}

listModels();
