import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import db from './db.js';
import { ensureFileExistsLocally } from './storage.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// זיכרון מטמון למניעת קריאה ופענוח כפול של קובצי PDF
const pdfCache = new Map();
const parsePDFText = async (filePath) => {
  // אם הקובץ כבר פוענח בעבר, נחזיר את הטקסט ישירות מהזיכרון
  if (pdfCache.has(filePath)) {
    return pdfCache.get(filePath);
  }

  // מנגנון תמיכה במכרזים המוזנים מראש למצגת (ללא קובץ פיזי עשיר)
  const basename = path.basename(filePath);
  if (basename.endsWith('tender_school_dekel.pdf')) {
    const text = `מכרז לבניית בית ספר יסודי דקל ברחובות. מזמין המכרז: עיריית רחובות.
תנאי סף: סיווג קבלני ג'5 בתחום הבנייה (100). ניסיון מוכח בבניית 3,000 מ"ר לפחות של מבני ציבור או חינוך ב-5 השנים האחרונות.
ערבות מכרז נדרשת: ערבות בנקאית אוטונומית בסך 250,000 ש"ח בתוקף ל-90 ימים.
לוחות זמנים: סיום פרויקט תוך 18 חודשים מיום קבלת צו התחלת עבודה. קנס פיגור של 5,000 ש"ח לכל יום איחור.
סעיפי כתב הכמויות העיקריים:עבודות עפר וחפירה, שלד בטון מזוין, מערכות אינסטלציה וכיבוי אש, חשמל ומתח נמוך, מיזוג אוויר מרכזי, אלומיניום וקירות מסך, ריצוף וחיפויי קרמיקה פנים וחוץ, עבודות גמר וטיח, פיתוח שטח וגינון.`;
    pdfCache.set(filePath, text);
    return text;
  }
  if (basename.endsWith('tender_sports_hall_netanya.pdf')) {
    const text = `מכרז להקמת אולם ספורט עירוני מרום בנתניה. מזמין המכרז: החברה לפיתוח נתניה.
תנאי סף: סיווג קבלני ג'4 לפחות. ניסיון מוכח בהקמת אולמות ספורט או מבני מפתחים גדולים בשווי של 10 מיליון ש"ח לפחות.
ערבות מכרז: 180,000 ש"ח בתוקף ל-90 ימים.
לוחות זמנים: תקופת ביצוע של 14 חודשים. קנסות פיגורים מוגדרים בחוזה המכרז.
פרטים הנדסיים מיוחדים: הקמת קונסטרוקציית פלדה ראשית לגג במפתחים גדולים במיוחד, איטום גג פנלים מבודדים, התקנת פרקט עץ מייפל FIBA תקני, מערכות מיזוג ומפוחים, תאורת ספורט מקצועית LED, מלתחות וחדרי סטודיו.`;
    pdfCache.set(filePath, text);
    return text;
  }
  
  // מוודאים שהקובץ אכן קיים בדיסק המקומי (אם לא, מורידים מהענן על פי דרישה)
  await ensureFileExistsLocally(filePath);

  const buffer = fs.readFileSync(filePath);
  let text = "";
  if (pdfParse && pdfParse.PDFParse) {
    const uint8 = new Uint8Array(buffer);
    const parser = new pdfParse.PDFParse(uint8);
    const result = await parser.getText();
    text = result.text || "";
  } else if (typeof pdfParse === 'function') {
    const result = await pdfParse(buffer);
    text = result.text || "";
  } else if (pdfParse && typeof pdfParse.default === 'function') {
    const result = await pdfParse.default(buffer);
    text = result.text || "";
  } else {
    throw new Error("Unable to determine PDF parsing library interface");
  }
  pdfCache.set(filePath, text);
  return text;
};

// משתמשים ב-/tmp לכתיבה בענן
const CACHE_DIR = '/tmp/barsuf_data/ai_cache';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

export const VECTOR_DB_PATH = path.join(CACHE_DIR, 'vector_db.json');

const updateLiveStatus = (tenderId, statusMsg) => {
  try {
    if (tenderId) {
      db.prepare('UPDATE tenders SET ai_progress = ? WHERE id = ?').run(statusMsg, tenderId);
    }
  } catch (e) { console.error('Status update failed:', e); }
};

const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
  return { genAI: new GoogleGenerativeAI(apiKey), fileManager: new GoogleAIFileManager(apiKey) };
};

const GEMINI_FLASH_CHAIN = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
const GEMINI_PRO_CHAIN = ['gemini-3.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite'];

const removeEmojis = (str) => {
  if (!str) return str;
  return str.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '')
            .replace(/✅/g, '')
            .replace(/❌/g, '')
            .replace(/⚠️/g, '');
};

const generateContentWithFallback = async (genAI, modelChain, promptOrContent, timeoutMs = 45000) => {
  let lastError = null;
  for (const modelName of modelChain) {
    try {
      console.log(`🤖 Attempting Gemini model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const callPromise = model.generateContent(promptOrContent);
      const result = await Promise.race([
        callPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout on model ${modelName}`)), timeoutMs))
      ]);
      
      console.log(`✅ Success with Gemini model: ${modelName}`);
      return result;
    } catch (err) {
      console.warn(`⚠️ Gemini model ${modelName} failed:`, err.message);
      lastError = err;
    }
  }
  throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו: ${lastError?.message}`);
};

async function getEmbeddings(text) {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (e) {
    console.error("Embedding generation failed:", e.message);
    return null;
  }
}

async function getEmbeddingsBatch(texts) {
  try {
    const { genAI } = getGeminiClients();
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    
    const batchSize = 30;
    const results = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batchTexts = texts.slice(i, i + batchSize);
      console.log(`Sending batch of ${batchTexts.length} chunks to gemini-embedding-2...`);
      const response = await model.batchEmbedContents({
        requests: batchTexts.map(text => ({
          model: "models/gemini-embedding-2",
          content: { parts: [{ text }] }
        }))
      });
      if (response && response.embeddings) {
        results.push(...response.embeddings.map(e => e.values));
      } else {
        results.push(...Array(batchTexts.length).fill(null));
      }
    }
    return results;
  } catch (e) {
    console.error("Batch embedding failed:", e.message);
    return Array(texts.length).fill(null);
  }
}

export const vectorStore = {
  data: fs.existsSync(VECTOR_DB_PATH) ? JSON.parse(fs.readFileSync(VECTOR_DB_PATH)) : [],
  async addText(text, embedding, metadata) {
    this.data.push({ text, embedding, metadata });
    fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(this.data));
  },
  async search(queryEmbedding, limit = 5) {
    if (!queryEmbedding) return [];
    const results = this.data.map(item => {
      const dotProduct = item.embedding.reduce((sum, val, i) => sum + val * queryEmbedding[i], 0);
      const mag1 = Math.sqrt(item.embedding.reduce((sum, val) => sum + val * val, 0));
      const mag2 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
      return { ...item, score: dotProduct / (mag1 * mag2) };
    });
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
};

export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  console.log(`🔍 Ingesting document: ${filePath} for project ${projectId}`);
  try {
    // Removed redundant fileManager GCS upload to speed up execution
    if (mimeType === 'application/pdf') {
      const pdfText = await parsePDFText(filePath);
      const chunks = pdfText.match(/[\s\S]{1,1500}/g) || []; // צ'אנקים
      console.log(`📄 PDF parsed into ${chunks.length} chunks. Starting batch embedding...`);
      
      const validChunks = chunks.filter(c => c.trim().length >= 50);
      const embeddings = await getEmbeddingsBatch(validChunks);
      
      let addedCount = 0;
      for (let i = 0; i < validChunks.length; i++) {
        const chunk = validChunks[i];
        const embedding = embeddings[i];
        if (embedding) {
          vectorStore.data.push({ 
            text: chunk, 
            embedding: embedding, 
            metadata: { projectId, date: new Date().toISOString() } 
          });
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(vectorStore.data));
      }
      console.log(`✅ Ingestion complete for ${projectId}. Indexed ${addedCount} chunks.`);
    }
    return true;
  } catch (e) { 
    console.error('❌ Ingest failed critical error:', e.message); 
    return false; 
  }
};

export const analyzeTender = async (filePath, tenderId, onPhaseOneComplete) => {
  updateLiveStatus(tenderId, "קורא את מסמך המכרז...");
  
  let pdfText;
  try {
    pdfText = await parsePDFText(filePath);
  } catch (e) {
    throw new Error(`Failed to read PDF: ${e.message}`);
  }
  
  const shortText = pdfText.slice(0, 4000);  // לשלב 1 - רק 4K תווים
  const fullText = pdfText.slice(0, 15000);  // לשלב 2 - 15K תווים

  // --- גוגל ג'מיני כספק ראשי (Primary Engine) ---
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    try {
      const { genAI } = getGeminiClients();

      // --- הפעלה במקביל של שני השלבים לקיצור משמעותי בזמן ההמתנה! ---
      const phaseOnePromise = (async () => {
        updateLiveStatus(tenderId, "שלב 1/2: ניתוח מהיר של נקודות מפתח (ג'מיני)...");
        try {
          const quickPrompt = `נתח בקצרה את המכרז הבא - תנאי סף, לוחות זמנים, קנסות עיקריים, ושלבי ביצוע מרכזיים. 
הצג 3-5 נקודות נורמליות וברורות שיקראו בצורה אנושית וזורמת ללקוח. ענה בעברית.
הוראת חובה: אין להשתמש באייקונים או באמוג'י בשום פנים ואופן! (ללא יוצא מן הכלל). שמור על ניסוח מקצועי, נקי, אנושי ופשוט להבנה.
[CONFIDENCE]70[/CONFIDENCE]

מסמך:
${shortText}`;
          const quickResult = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, quickPrompt, 15000);
          const quickAnalysis = removeEmojis(quickResult.response.text());
          if (onPhaseOneComplete) onPhaseOneComplete(quickAnalysis);
          return quickAnalysis;
        } catch (e) {
          console.warn('Gemini Phase 1 quick analysis failed:', e.message);
          return null;
        }
      })();

      const phaseTwoPromise = (async () => {
        try {
          const geminiPrompt = `נתח את מסמך המכרז הבא לעומק בעברית.
הוראת חובה: אסור בשום אופן להשתמש באייקונים או באמוג'י בכלל! (אפס אייקונים). עצב את הטקסט בצורה חלקה, עניינית, ורשמית.
כתוב את הניתוח באמצעות נקודות (Bullet points) נורמליות, בצורה אנושית שקלה לקריאה, ללא כותרות רובוטיות מידי.

התייחס ל:
- תמצית מהות המכרז.
- סיווג קבלני נדרש, ערבויות ותקופת ביצוע.
- המלצה מקצועית מנומקת האם לגשת למכרז או לא (במילים בלבד).
- תנאי סף, לוחות זמנים, קנסות, ודרישות ביטוח.
- "שלבי ביצוע להנגשה ללקוח" המתרגם את המכרז לשלבי עבודה פשוטים וברורים.

חובה לסיים את התשובה עם תגית ביטחון: [CONFIDENCE]XX[/CONFIDENCE] (מספר מ-1 עד 100).

בנוסף, חובה לכלול בלוק JSON של אומדן כתב כמויות ראשוני לפי המכרז (מחירי שוק סבירים בישראל):
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\`

מסמך המכרז:
${fullText}`;

          const deepResult = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, geminiPrompt, 45000);
          const rawText = deepResult.response.text();

          let boq_json = null;
          const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch) {
            try {
              JSON.parse(jsonMatch[1].trim());
              boq_json = jsonMatch[1].trim();
            } catch (e) { console.warn('BoQ JSON parse failed in Gemini analysis:', e.message); }
          }
          const analysis = removeEmojis(rawText.replace(jsonMatch?.[0] || '', '').trim());
          return { analysis, boq_json };
        } catch (geminiDeepErr) {
          console.warn('Gemini Phase 2 deep analysis failed:', geminiDeepErr.message);
          throw geminiDeepErr;
        }
      })();

      try {
        const deepResult = await phaseTwoPromise;
        updateLiveStatus(tenderId, "ניתוח הושלם");
        return deepResult;
      } catch (geminiDeepErr) {
        console.warn('Gemini Phase 2 deep analysis failed, returning phase 1 result:', geminiDeepErr.message);
        const quickAnalysis = await phaseOnePromise;
        if (quickAnalysis) {
          updateLiveStatus(tenderId, "ניתוח הושלם (מהיר)");
          return { analysis: quickAnalysis, boq_json: null };
        }
        throw geminiDeepErr;
      }
    } catch (geminiGeneralErr) {
      console.warn('Gemini analysis failed completely:', geminiGeneralErr.message);
      throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו בניתוח המסמך: ${geminiGeneralErr.message}`);
    }
  } else {
    throw new Error(`כל שירותי הבינה המלאכותית נכשלו בניתוח המסמך: Missing GEMINI_API_KEY`);
  }
};

export const generateProposal = async (filePath, tenderId) => {
  updateLiveStatus(tenderId, "מחלץ נתוני מכרז...");
  
  let pdfText;
  try {
    pdfText = await parsePDFText(filePath);
  } catch (e) {
    throw new Error(`Failed to read PDF: ${e.message}`);
  }
  const truncatedText = pdfText.slice(0, 12000);

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "") {
    try {
      updateLiveStatus(tenderId, "מתחבר למאגר המחירים ההיסטורי (ג'מיני)...");
      const queryEmbedding = await getEmbeddings("מחירי יחידה, בנייה, כתב כמויות");
      const matches = await vectorStore.search(queryEmbedding, 10);
      const context = matches.map(m => m.text).join('\n---\n');

      updateLiveStatus(tenderId, "בונה כתב כמויות ומחשב מחיר מטרה (ג'מיני)...");
      const fallbackPrompt = `הכן הצעת מחיר מלאה, מקצועית ומכובדת בעברית, מבוססת על המכרז והיסטוריית המחירים.
      
היסטוריית מחירים:
${context}
 
מסמך המכרז:
${truncatedText}
 
דרישות לכתיבת ההצעה (חובה לעקוב בדיוק רב!):
1. **הצעה כמסמך רשמי:** כתוב את ההצעה כמסמך שלם ללקוח הכולל:
   - לכבוד: מזמין העבודה.
   - תאריך עדכני.
   - הנדון: הצעת מחיר לביצוע פרויקט (שם הפרויקט).
   - פסקת פתיחה מכובדת.
2. **מתודולוגיה ושלבי ביצוע:** פרק מסודר המפרט את שלבי העבודה להצגה ללקוח בצורה אנושית וברורה.
3. **טבלת כתב כמויות בגוף ההצעה:** חובה עליך להציג את כל סעיפי התמחור כטבלת Markdown יפה ומסודרת בגוף ההצעה עצמה (כולל סעיף, כמות, יחידה, מחיר ליחידה, וסה"כ). בסוף הטבלה הוסף את השורה התחתונה של הסכום הכולל.
4. **חתימה ופרטי המציע:** חובה לסיים את המסמך עם הכותרת "### חתימה" ותחתיה בדיוק את הפרטים הבאים:
   - שם המציע / החברה המציעה: ברסוף בע״מ
   - שם מורשה חתימה: שמעון אזולאי
   - תפקיד: מנכ״ל
   - חתימה וחותמת: שמעון אזולאי, מנכ״ל - ברסוף בע״מ
5. **בלוק JSON (חובה לגיבוי נתונים):** בסוף התשובה כולה, הוסף בלוק JSON תקני של כתב הכמויות. על מחירי היחידה להיות הגיוניים (שקלים).
מבנה הבלוק יהיה בפורמט הבא בדיוק:
\`\`\`json
[{"id":1,"section":"שם סעיף","item":"תיאור פריט","quantity":100,"unit":"מ\"ר","unitPrice":150}]
\`\`\`
6. **עיצוב נקי:** חל איסור מוחלט להשתמש באייקונים או אימוג'ים (emojis) לאורך כל המסמך!
7. **תגית ודאות:** חובה לסיים את התשובה עם תגית הוודאות: [CONFIDENCE]XX[/CONFIDENCE]`;

      const { genAI } = getGeminiClients();
      const result = await generateContentWithFallback(genAI, GEMINI_PRO_CHAIN, fallbackPrompt, 45000);

      updateLiveStatus(tenderId, "הצעה מוכנה");
      const text = result.response.text(); // חילוץ המלל המלא שנוצר על ידי ג'מיני
      let boq_json = null; // משתנה לשמירת כתב הכמויות כ-JSON תקין
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/); // חיפוש בלוק JSON בתוך התשובה הכתובה
      if (jsonMatch) { // אם נמצא בלוק JSON מתאים
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()); // ניסיון לפענח את ה-JSON כדי לוודא תקינות סינטקטית
          if (Array.isArray(parsed) && parsed.length > 0) { // בודקים שזהו מערך לא ריק של פריטים
            boq_json = jsonMatch[1].trim(); // שומרים את ה-JSON הנקי והתקין
          }
        } catch (e) {
          console.warn('BoQ JSON validation failed in generateProposal:', e.message); // התראה ביומן השרת אם ה-JSON פגום
        }
      }
      return { proposal: removeEmojis(text.replace(jsonMatch?.[0] || '', '').trim()), boq_json }; // מחזירים את ההצעה הכתובה (ללא בלוק ה-JSON) ואת ה-JSON התקין בנפרד
    } catch (geminiErr) {
      console.warn("Gemini failed for generateProposal:", geminiErr.message);
      throw new Error(`כל שירותי הבינה המלאכותית של גוגל נכשלו ביצירת ההצעה: ${geminiErr.message}`);
    }
  } else {
    throw new Error("Missing GEMINI_API_KEY");
  }
};

export const askQuestion = async (projectId, question) => {
  const queryEmbedding = await getEmbeddings(question);
  
  // סינון הנתונים ב-Vector DB כך שיתאימו אך ורק לפרויקט/מכרז המבוקש (מניעת ערבוב מסמכים!)
  const filteredChunks = vectorStore.data.filter(
    item => item.metadata?.projectId?.toString() === projectId?.toString()
  );
  
  // חיפוש ודירוג סמנטי מקומי
  const results = filteredChunks.map(item => {
    const dotProduct = item.embedding.reduce((sum, val, i) => sum + val * queryEmbedding[i], 0);
    const mag1 = Math.sqrt(item.embedding.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    return { ...item, score: dotProduct / (mag1 * mag2) };
  });
  
  const matches = results.sort((a, b) => b.score - a.score).slice(0, 5);
  let context = matches.map(m => m.text).join('\n---\n');

  // שליפת מידע מיוחד ממסד הנתונים עבור פרויקטים ומכרזים (שם, ניתוח חכם, הצעה, כתב כמויות)
  let extraDbInfo = '';
  try {
    if (projectId && projectId.toString().startsWith('tender-')) {
      const tenderId = Number(projectId.toString().replace('tender-', ''));
      const tender = db.prepare('SELECT name, analysis, proposal, boq_json FROM tenders WHERE id = ?').get(tenderId);
      if (tender) {
        extraDbInfo = `
=== מידע על המכרז מתוך המערכת ===
שם המכרז: ${tender.name || ''}

ניתוח מכרז חכם שיוצר עבורו:
${tender.analysis || 'טרם נותח'}

הצעת מחיר / אומדן שיוצרו עבורו:
${tender.proposal || 'טרם הופקה הצעה'}

כתב כמויות דינמי (BoQ JSON):
${tender.boq_json || ''}
=================================
`;
      }
    } else if (projectId) {
      const pId = Number(projectId);
      if (!isNaN(pId)) {
        const project = db.prepare('SELECT name, analysis, proposal, boq_json FROM projects WHERE id = ?').get(pId);
        if (project) {
          extraDbInfo = `
=== מידע על הפרויקט מתוך המערכת ===
שם הפרויקט: ${project.name || ''}

ניתוח המכרז המשויך לפרויקט:
${project.analysis || ''}

הצעת מחיר / אומדן המשויך לפרויקט:
${project.proposal || ''}

כתב כמויות של הפרויקט (BoQ JSON):
${project.boq_json || ''}
==================================
`;
        }
      }
    }
  } catch (dbErr) {
    console.error("Failed to fetch database context for askQuestion:", dbErr);
  }

  // שילוב המידע ממסד הנתונים בהקשר ל-AI
  if (extraDbInfo) {
    context = `${extraDbInfo}\n\n=== קטעים רלוונטיים ממסמכי המקור ===\n${context}`;
  }
  
  try {
    const { genAI } = getGeminiClients();
    const prompt = `ענה על: ${question}. הקשר: ${context}. ענה בעברית. חובה לסיים את התשובה עם תגית ביטחון בפורמט הזה בדיוק: [CONFIDENCE]XX[/CONFIDENCE] המייצגת את רמת הוודאות שלך בתשובה (מ-1 עד 100).`;
    const result = await generateContentWithFallback(genAI, GEMINI_FLASH_CHAIN, prompt, 20000);
    return result.response.text();
  } catch (err) {
    console.error("Gemini failed for askQuestion:", err);
    throw err;
  }
};

export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    const upload = await fileManager.uploadFile(filePath, { mimeType, displayName: "Receipt" });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([{ fileData: { mimeType: upload.file.mimeType, fileUri: upload.file.uri } }, { text: "חלץ נתוני קבלה ל-JSON. חובה לכלול בשדה 'confidence' מספר מ-1 עד 100." }]);
    return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("Receipt analysis failed:", e);
    return { error: "Failed to analyze receipt" };
  }
};
