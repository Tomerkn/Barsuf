import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

// שם הקיבול בענן של בארסוף
const BUCKET_NAME = 'barsuf-media-storage-1777314059';
let storage;

try {
  // יצירת מופע התחברות ל-Google Cloud Storage
  storage = new Storage();
} catch (e) {
  console.warn('⚠️ לא הצלחנו לאתחל את חיבור ה-GCS (תקין בפיתוח מקומי ללא מפתחות):', e.message);
}

/**
 * מעלה קובץ מקומי לקיבולת הענן (Google Cloud Storage)
 * @param {string} localPath - נתיב מלא לקובץ המקומי במערכת
 * @param {string} filename - שם הקובץ שיווצר בענן
 */
export const uploadFileToCloud = async (localPath, filename) => {
  if (!storage) {
    console.log(`☁️ פיתוח מקומי: פוסח על העלאת הקובץ ${filename} לענן`);
    return;
  }
  try {
    console.log(`☁️ מעלה קובץ לענן (GCS): ${filename}...`);
    await storage.bucket(BUCKET_NAME).upload(localPath, {
      destination: `uploads/${filename}`
    });
    console.log(`☁️ העלאה לענן הושלמה בהצלחה: ${filename}`);
  } catch (err) {
    console.error(`☁️ שגיאה במהלך העלאת ${filename} לענן:`, err.message);
    throw err;
  }
};

/**
 * מוריד קובץ מהענן לדיסק המקומי במידה והוא לא קיים
 * @param {string} localPath - נתיב היעד לקובץ המקומי
 * @param {string} filename - שם הקובץ להורדה מתוך הענן
 */
export const downloadFileFromCloud = async (localPath, filename) => {
  if (fs.existsSync(localPath)) {
    return true; // הקובץ כבר קיים מקומית, אין צורך להוריד
  }
  
  if (!storage) {
    console.warn(`☁️ לא ניתן להוריד מהענן בפיתוח מקומי (אין חיבור GCS): ${filename}`);
    return false;
  }
  
  try {
    console.log(`☁️ מוריד קובץ מהענן: ${filename} לתוך ${localPath}...`);
    // מוודאים שתיקיית היעד קיימת
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    await storage.bucket(BUCKET_NAME).file(`uploads/${filename}`).download({
      destination: localPath
    });
    console.log(`☁️ הורדה מהענן הושלמה בהצלחה: ${filename}`);
    return true;
  } catch (e) {
    console.error(`☁️ הורדת קובץ מהענן נכשלה עבור ${filename}:`, e.message);
    return false;
  }
};

/**
 * מוודא שהקובץ קיים מקומית בדיסק (ואם לא, מוריד אותו מייד מהענן)
 * @param {string} localPath - הנתיב המקומי המלא של הקובץ
 */
export const ensureFileExistsLocally = async (localPath) => {
  if (fs.existsSync(localPath)) return true;
  const filename = path.basename(localPath);
  return await downloadFileFromCloud(localPath, filename);
};
