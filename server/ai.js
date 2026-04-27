import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import db from './db.js';

const CACHE_DIR = path.join(process.cwd(), 'server', 'data', 'gemini_cache');

// מוודא שתיקיית הקאש קיימת
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// התחברות ל-API של גוגל ג'מיני
// במידה ואין מפתח, המערכת תזרוק שגיאה ברורה
const getGeminiClients = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing! אנא הוסף מפתח התחברות כדי שברבור יוכל לפעול.');
  }
  return {
    genAI: new GoogleGenerativeAI(apiKey),
    fileManager: new GoogleAIFileManager(apiKey)
  };
};

/**
 * העלאת מסמך לג'מיני ושמירת המזהה (URI) שלו בזיכרון המקומי
 */
export const ingestDocument = async (projectId, filePath, mimeType = "application/pdf") => {
  try {
    const { fileManager } = getGeminiClients();
    
    console.log(`Uploading ${filePath} to Gemini File API...`);
    // העלאת הקובץ לשרתים של גוגל - הם יודעים להתמודד עם שרטוטים, טבלאות ו-PDF ענקיים בקלות
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: `Project ${projectId} Document`
    });

    console.log(`Upload complete. Gemini URI: ${uploadResponse.file.uri}`);

    // שמירת הנתונים בקובץ קאש פשוט, כדי שנדע באילו קבצים להשתמש כשהמשתמש שואל שאלה
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    let files = [];
    if (fs.existsSync(cachePath)) {
      files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }
    
    files.push({
      name: uploadResponse.file.name,
      uri: uploadResponse.file.uri,
      mimeType: uploadResponse.file.mimeType,
      localPath: filePath,
      uploadTime: Date.now()
    });

    fs.writeFileSync(cachePath, JSON.stringify(files, null, 2));
    return true;
  } catch (error) {
    console.error('Error ingesting document via Gemini:', error);
    throw error;
  }
};

/**
 * ניתוח תמונת קבלה והחזרת פרטי ההוצאה
 */
export const analyzeReceipt = async (filePath, mimeType) => {
  try {
    const { fileManager, genAI } = getGeminiClients();
    
    console.log(`Uploading receipt ${filePath} to Gemini File API for OCR...`);
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType,
      displayName: `Receipt for OCR`
    });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      אתה מומחה להנהלת חשבונות. לפניך קבלה או חשבונית. 
      חלץ את המידע הבא מהתמונה והחזר אותו אך ורק בפורמט JSON תקין, ללא טקסט מקדים וללא תגיות מיוחדות כמו \`\`\`json.
      
      המפתחות ב-JSON יהיו:
      - amount: הסכום הסופי לתשלום במספרים בלבד (ללא סמל המטבע. לדוגמה: 150.5).
      - supplier: שם הספק או בית העסק (מחרוזת).
      - date: תאריך העסקה בפורמט YYYY-MM-DD. אם לא מצאת, השאר ריק.
      - description: תיאור קצר של המהות העיקרית של הקבלה (עד 5 מילים. לדוגמה: "כלי עבודה", "חומרי בניין", או "ארוחת צהריים").
    `;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: prompt }
    ]);

    let responseText = result.response.text();
    // Clean up potential markdown formatting
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error analyzing receipt via Gemini:', error);
    return null;
  }
};

/**
 * שאלת שאלה על סמך כל המסמכים שהועלו לפרויקט
 */
export const askQuestion = async (projectId, question) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    const cachePath = path.join(CACHE_DIR, `project_${projectId}.json`);
    
    if (!fs.existsSync(cachePath)) {
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה. אנא העלה מסמכים תחילה.";
    }

    let files = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    if (files.length === 0) {
      return "הפרויקט ריק ממסמכים.";
    }

    // המודל המתקדם והמהיר של גוגל
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // יצירת מערך שכולל את כל הקבצים וגם את ההוראה + השאלה
    const promptParts = [
      { text: "אתה עוזר בינה מלאכותית למנהל פרויקטים בבנייה ששמו 'ברבור 🦢'. המשתמש יצרף מסמכים (כמו תוכניות חשמל, קבלות, חשבוניות וכו'). עליך לענות לו באופן מדויק על השאלה על סמך המסמכים המצורפים. הקפד לקרוא היטב טבלאות ושרטוטים. ענה בעברית בלבד ובטון חברי ועוזר. חשוב מאוד: אל תשתמש בעיצוב Markdown (כמו כוכביות להדגשה) ואל תשתמש בסימונים מתמטיים באנגלית או ב-LaTeX (כמו $ או \\pi). כתוב את כל המספרים והחישובים כטקסט פשוט וברור בעברית כדי למנוע שיבושי קריאה (לדוגמה: 'פיי כפול 0.2'). אם אינך מוצא את התשובה במסמכים, אמור פשוט שאין לך מידע כזה שם. הנה השאלה:\n\n" + question }
    ];

    let fileListText = "רשימת המסמכים המצורפים כרגע לפרויקט (שאתה קורא כרגע מתוכם):\n";

    // הוספת כל המסמכים של הפרויקט להקשר של המודל
    for (const file of files) {
      // Find original name from db by searching the filename or just use the local file name if available
      const originalName = file.localPath ? path.basename(file.localPath).split('-').slice(1).join('-') : file.name;
      fileListText += `- ${originalName || 'מסמך ללא שם'} (הועלה בתאריך: ${new Date(file.uploadTime).toLocaleDateString('he-IL')})\n`;
      
      promptParts.unshift({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.uri
        }
      });
    }

    // צירוף רשימת הקבצים שהמשתמש העלה לגלריית הפרויקט (ללא תוכן, רק שמות)
    try {
      // Use try-catch for the query in case the folder column doesn't exist yet
      let mediaFiles = [];
      try {
        mediaFiles = db.prepare('SELECT original_name, upload_date, folder FROM project_media WHERE project_id = ?').all(projectId);
      } catch (e) {
        mediaFiles = db.prepare('SELECT original_name, upload_date FROM project_media WHERE project_id = ?').all(projectId);
      }

      if (mediaFiles.length > 0) {
        fileListText += "\nבנוסף, המשתמש שמר בגלריית הפרויקט את התמונות/מסמכים הבאים (אין לך גישה לתוכן שלהם, רק לשמם ולתאריך):\n";
        for (const media of mediaFiles) {
          const folderText = media.folder ? `תיקייה: ${media.folder}` : '';
          fileListText += `- ${media.original_name} (${folderText} | בתאריך: ${new Date(media.upload_date).toLocaleDateString('he-IL')})\n`;
        }
      }
    } catch (e) {
      console.error("Could not fetch project media for prompt", e);
    }

    // צירוף המשימות ולוחות הזמנים של הפרויקט
    try {
      let tasks = [];
      try {
        tasks = db.prepare('SELECT name, start_date, end_date, progress FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(projectId);
      } catch (e) {
        // Table might not exist yet if migration failed
      }

      if (tasks.length > 0) {
        fileListText += "\n\nלהלן לוח הזמנים (Gantt) המוגדר לפרויקט כרגע:\n";
        for (const task of tasks) {
          fileListText += `- שלב/משימה: "${task.name}", תאריכים: ${task.start_date} עד ${task.end_date}, התקדמות: ${task.progress}%\n`;
        }
        fileListText += "\nאם המשתמש שואל לגבי לוחות זמנים, שלבים או התקדמות הפרויקט, תענה לו על בסיס נתוני הגאנט האלו.\n";
      }
    } catch (e) {
      console.error("Could not fetch project tasks for prompt", e);
    }

    // הוספת טקסט הרשימה להנחיה המרכזית
    promptParts.push({ text: `\n\n${fileListText}\n\nאם המשתמש שואל אילו קבצים/מסמכים יש לפרויקט, תסכם לו את הרשימה הנ"ל בצורה יפה.` });

    console.log(`Asking Gemini question across ${files.length} documents...`);
    const result = await model.generateContent(promptParts);
    return result.response.text();
  } catch (error) {
    console.error('Error asking question via Gemini:', error);
    throw error;
  }
};

/**
 * קריאת נתונים מקובץ אקסל/CSV והמרתם למערך JSON
 */
export const extractDataFromExcel = async (filePath, mimeType, targetTable) => {
  try {
    const { genAI, fileManager } = getGeminiClients();
    
    // Upload file to Gemini
    console.log(`Uploading spreadsheet ${filePath} to Gemini...`);
    const uploadResponse = await fileManager.uploadFile(filePath, {
      mimeType: mimeType || 'text/csv',
      displayName: "spreadsheet_import"
    });
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let schemaPrompt = '';
    if (targetTable === 'budgets') {
      schemaPrompt = 'category (string), total_amount (number), approved_date (YYYY-MM-DD)';
    } else if (targetTable === 'expenses') {
      schemaPrompt = 'description (string), contractor_name (string), budget_category (string), amount (number), date (YYYY-MM-DD)';
    } else if (targetTable === 'incomes') {
      schemaPrompt = 'description (string), amount (number), date (YYYY-MM-DD)';
    } else if (targetTable === 'contractors') {
      schemaPrompt = 'name (string), specialization (string), phone (string), email (string)';
    }

    const prompt = `This is a spreadsheet containing data for the "${targetTable}" table. 
Please extract all the rows from this file and return them strictly as a JSON array of objects.
Do not include any markdown formatting like \`\`\`json. 
Map the columns to the best of your ability to match this schema for each object:
{ ${schemaPrompt} }
If a field is missing, leave it empty or null. Try to convert dates to YYYY-MM-DD format. Convert amounts to numbers.`;

    console.log(`Extracting data for ${targetTable}...`);
    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      },
      { text: prompt }
    ]);
    
    const textResponse = result.response.text();
    console.log('Gemini Extraction Response:', textResponse.substring(0, 200) + '...');
    
    // Clean response (sometimes it wraps in markdown even when asked not to)
    let cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedData = JSON.parse(cleanText);
    return parsedData;
  } catch (error) {
    console.error('Error extracting data from spreadsheet:', error);
    throw error;
  }
};
