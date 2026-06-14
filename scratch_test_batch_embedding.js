import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testBatch() {
  const chunks = [
    "סעיף 1: עבודות עפר וסלילה בכביש הגישה הראשי לפרויקט שערי עכו.",
    "סעיף 2: עבודות בטון, יציקת קירות תמך וכלונסאות לפי תוכנית קונסטרוקציה.",
    "סעיף 3: ריצוף באבן משתלבת, כולל מצע גיר מהודק ואבן שפה מתאימה.",
    "סעיף 4: עבודות גינון ופיתוח נופי, מערכות השקיה ממוחשבות ונטיעת עצים.",
    "סעיף 5: מערכות ניקוז ותיעול, כולל קולטנים וצינורות בטון בקוטר 60 ס\"מ."
  ];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const start = Date.now();
    
    const result = await model.batchEmbedContents({
      requests: chunks.map(chunk => ({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: chunk }] }
      }))
    });
    
    console.log(`✅ Success! Embedded ${result.embeddings.length} chunks in ${Date.now() - start}ms`);
    console.log("First embedding length:", result.embeddings[0].values.length);
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
}

testBatch();
