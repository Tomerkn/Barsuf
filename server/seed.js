import db from './db.js'; // מביאים את החיבור למסד הנתונים
import { uploadFileToCloud } from './storage.js';
import fs from 'fs';
import path from 'path';

export async function reseedDatabase(force = false) {
  const projectsCount = db.prepare("SELECT count(*) as count FROM projects").get().count;
  
  if (!force && projectsCount > 0) {
    console.log('Database already seeded. Skipping re-seeding.');
    return;
  }

  console.log('Seeding database with matching Monday presentation data...');

  // יצירת קבצי דמו פיזיים והעלאתם לענן כדי למנוע שגיאות קריאה של ה-PDF
  const uploadsDir = '/tmp/barsuf_data/uploads';
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const rootDir = process.cwd();
  const testPdfPath = path.join(rootDir, 'test_tender.pdf');
  
  if (fs.existsSync(testPdfPath)) {
    const file1 = '1718228000000-tender_school_dekel.pdf';
    const file2 = '1718229000000-tender_sports_hall_netanya.pdf';
    const path1 = path.join(uploadsDir, file1);
    const path2 = path.join(uploadsDir, file2);

    fs.copyFileSync(testPdfPath, path1);
    fs.copyFileSync(testPdfPath, path2);

    console.log('☁️ Copying and uploading dummy tender PDFs...');
    await uploadFileToCloud(path1, file1).catch(e => console.error(`Failed to upload ${file1} to GCS:`, e.message));
    await uploadFileToCloud(path2, file2).catch(e => console.error(`Failed to upload ${file2} to GCS:`, e.message));
  }

  if (force) {
    console.log('Wiping database tables...');
    db.prepare("PRAGMA foreign_keys = OFF").run();
    db.prepare("DELETE FROM projects").run();
    db.prepare("DELETE FROM budgets").run();
    db.prepare("DELETE FROM expenses").run();
    db.prepare("DELETE FROM incomes").run();
    db.prepare("DELETE FROM orders").run();
    db.prepare("DELETE FROM daily_logs").run();
    db.prepare("DELETE FROM tasks").run();
    db.prepare("DELETE FROM warranty_tickets").run();
    db.prepare("DELETE FROM contractors").run();
    db.prepare("DELETE FROM tenders").run();
    db.prepare("DELETE FROM files").run();
    try {
      db.prepare("DELETE FROM sqlite_sequence").run();
    } catch (e) {
      console.warn("Failed to reset sqlite_sequence:", e.message);
    }
    db.prepare("PRAGMA foreign_keys = ON").run();
  }

  // --- 8 קבלנים תואמי Monday Board 5098147406 ---
  const insertContractor = db.prepare("INSERT INTO contractors (name, specialization, phone, email, monday_id) VALUES (?, ?, ?, ?, ?)");
  const c1 = insertContractor.run("אלון פיתוח וגינון בע\"מ", "פיתוח חוץ", "052-1111111", "alon@landscape.co.il", "2995723221");
  const c2 = insertContractor.run("גיא עבודות עפר ופיתוח בע\"מ", "פיתוח חוץ", "053-2222222", "guy@earthworks.co.il", "2995712847");
  const c3 = insertContractor.run("א.א אינסטלציה וכיבוי אש בע\"מ", "אינסטלציה", "054-3333333", "aa@plumbing.co.il", "2995731118");
  const c4 = insertContractor.run("אורן חשמל ומערכות תקשורת בע\"מ", "חשמל", "050-4444444", "oren@electric.co.il", "2995741823");
  const c5 = insertContractor.run("שחף עבודות גבס וצבע בע\"מ", "גבס וצבע", "058-5555555", "shahaf@drywall.co.il", "2995731056");
  const c6 = insertContractor.run("רפאל ריצוף וחיפוי בע\"מ", "ריצוף", "052-6666666", "rafael@tiling.co.il", "2995712986");
  const c7 = insertContractor.run("בנייני ברזל ויציקות בע\"מ", "שלד", "053-7777777", "barzelyezika@skeleton.co.il", "2995741827");
  const c8 = insertContractor.run("סלע יציקות מילויים בע\"מ", "שלד", "054-8888888", "sela@concrete.co.il", "2995741828");

  const contId1 = c1.lastInsertRowid;
  const contId2 = c2.lastInsertRowid;
  const contId3 = c3.lastInsertRowid;
  const contId4 = c4.lastInsertRowid;
  const contId5 = c5.lastInsertRowid;
  const contId6 = c6.lastInsertRowid;
  const contId7 = c7.lastInsertRowid;
  const contId8 = c8.lastInsertRowid;

  // --- 2 פרויקטים פעילים תואמי Monday (Won - "זכינו") ---
  const insertProject = db.prepare("INSERT INTO projects (name, location, end_date, status, analysis, proposal, boq_json, monday_id, monday_board_id, monday_token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  
  const p1 = insertProject.run(
    "בניית בית פרטי - משפחת כהן (נווה עמל)", 
    "נווה עמל, הרצליה", 
    "2026-10-15", 
    "תקין",
    "בניית וילה פרטית יוקרתית כוללת בריכת שחייה ומפרט אדריכלי מורכב.",
    null,
    null,
    "2995741804",
    "5098147203",
    "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE"
  );
  
  const p2 = insertProject.run(
    "עבודות פיתוח ותשתיות - מתחם עסקים שורק קו 4", 
    "אזור תעשייה שורק", 
    "2026-08-30", 
    "תקין",
    "עבודות עפר, פיתוח, סלילה והנחת תשתיות מים ותיעול במתחם מסחרי שורק.",
    null,
    null,
    "2995791814",
    "5098147203",
    "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE"
  );

  const projId1 = p1.lastInsertRowid;
  const projId2 = p2.lastInsertRowid;

  // --- סעיפי תקציב (Budgets) ---
  const insertBudget = db.prepare("INSERT INTO budgets (project_id, category, total_amount) VALUES (?, ?, ?)");
  
  // פרויקט 1 - בית פרטי משפחת כהן
  const b1_1 = insertBudget.run(projId1, "עבודות שלד ופיתוח", 1200000).lastInsertRowid;
  const b1_2 = insertBudget.run(projId1, "חשמל ותקשורת", 300000).lastInsertRowid;
  const b1_3 = insertBudget.run(projId1, "אינסטלציה ומיזוג", 250000).lastInsertRowid;
  const b1_4 = insertBudget.run(projId1, "גמרים וצבע", 200000).lastInsertRowid;
  
  // פרויקט 2 - פיתוח שורק
  const b2_1 = insertBudget.run(projId2, "עבודות עפר וחפירה", 500000).lastInsertRowid;
  const b2_2 = insertBudget.run(projId2, "סלילה ואספלט", 400000).lastInsertRowid;
  const b2_3 = insertBudget.run(projId2, "צנרת ותיעול מים", 250000).lastInsertRowid;

  // --- הוצאות (Expenses) ---
  const insertExpense = db.prepare("INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)");
  
  // פרויקט 1 הוצאות (כהן)
  insertExpense.run(projId1, b1_1, contId7, 850000, "2026-05-10", "חשבון חלקי 1 - יציקת רפסודה ועמודים");
  insertExpense.run(projId1, b1_2, contId4, 120000, "2026-05-28", "הנחת צנרת מוגנת בבטון וחיווט זמני");
  insertExpense.run(projId1, b1_3, contId3, 90000, "2026-06-02", "פריסת קווי מים ראשיים ודלייה");

  // פרויקט 2 הוצאות (שורק)
  insertExpense.run(projId2, b2_1, contId2, 380000, "2026-05-15", "עבודות חפירה, יישור ומילוי מצעים");
  insertExpense.run(projId2, b2_3, contId3, 110000, "2026-06-01", "הנחת צינורות ביוב קוטר 80 ס״מ");

  // --- הכנסות (Incomes) ---
  const insertIncome = db.prepare("INSERT INTO incomes (project_id, amount, date, description) VALUES (?, ?, ?, ?)");
  
  // פרויקט 1 הכנסות (כהן)
  insertIncome.run(projId1, 950000, "2026-04-10", "מקדמה תחילת עבודה משפחת כהן");
  
  // פרויקט 2 הכנסות (שורק)
  insertIncome.run(projId2, 500000, "2026-05-01", "תשלום ראשון על פי אבן דרך חפירות");

  // --- יומני עבודה יומיים (Daily Logs) ---
  const insertLog = db.prepare("INSERT INTO daily_logs (project_id, date, manager_name, weather, workers_count, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertLog.run(projId1, "2026-06-12", "אבי כהן", "בהיר וחם", 14, "בוצעו תיקוני טפסנות ליציקת תקרת שלד קומה א׳. מפקח הבנייה אישר את הברזל.", "");
  insertLog.run(projId2, "2026-06-13", "יוסי לוי", "חם", 8, "הידוק מצעים ופיזור כורכר באתר שורק קו 4. עבודה מול מודד מוסמך.", "");

  // --- משימות גאנט (Tasks) ---
  const insertTask = db.prepare("INSERT INTO tasks (project_id, name, start_date, end_date, progress, monday_id) VALUES (?, ?, ?, ?, ?, ?)");
  
  // פרויקט 1 (בית פרטי כהן)
  insertTask.run(projId1, "עבודות עפר ויסודות", "2026-05-01", "2026-05-25", 100, "t1_1");
  insertTask.run(projId1, "יציקת שלד קומת קרקע", "2026-05-26", "2026-06-20", 75, "t1_2");
  insertTask.run(projId1, "מערכות ואיטום שלד", "2026-06-21", "2026-08-15", 0, "t1_3");
  insertTask.run(projId1, "עבודות גמר, ריצוף ופיתוח", "2026-08-16", "2026-10-15", 0, "t1_4");

  // פרויקט 2 (מתחם שורק)
  insertTask.run(projId2, "חפירה, מילוי ויישור שטח", "2026-05-05", "2026-05-30", 100, "t2_1");
  insertTask.run(projId2, "הנחת קווי ביוב ותיעול", "2026-06-01", "2026-07-10", 35, "t2_2");
  insertTask.run(projId2, "סלילה, פיזור מצעים ואספלט", "2026-07-11", "2026-08-30", 0, "t2_3");


  // --- 6 מכרזים מנותחים תואמי Monday ---
  const insertTender = db.prepare("INSERT INTO tenders (name, filename, upload_date, status, analysis, proposal, boq_json, monday_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  
  // מכרז 1 - מגדלי הים התיכון חולון
  const analysis1 = `### דוח ניתוח מכרז: עבודות שלד ותשתיות - מגדלי הים התיכון חולון בע"מ
  
**1. תמצית המכרז**
הקמת שלד בניין רב קומות כולל חפירה ודיפון, עבודות ביסוס, שלד בטון מזוין ומערכות שלד מורכבות.
  
**2. תנאי סף עיקריים**
* סיווג קבלני נדרש: ג'5 (בנייה).
* ערבות מכרז: 250,000 ₪ בתוקף למשך 90 ימים.
  
**3. נקודות מפתח לביצוע**
* תקופת ביצוע: 18 חודשים.
* סיכון: עבודה סמוך לקווי רכבת קלה - דורש אישורי בטיחות מיוחדים.`;

  const boq1 = [
    {"section": "01", "item": "עבודות עפר וחפירות עמוקות", "quantity": 3000, "unit": "מ\"ק", "unitPrice": 90},
    {"section": "02", "item": "יסודות ועמודי בטון מזוין", "quantity": 5000, "unit": "מ\"ק", "unitPrice": 480}
  ];

  const proposal1 = `### הצעת מחיר עבור: מכרז מגדלי הים התיכון חולון
סך כל הצעתנו לביצוע הפרויקט על פי כתב הכמויות עומדת על: **1,450,000 ₪** (לא כולל מע"מ).`;

  insertTender.run(
    "עבודות שלד ותשתיות - מגדלי הים התיכון חולון בע\"מ",
    "1718228000000-tender_school_dekel.pdf",
    "2026-06-12T12:00:00.000Z",
    "נותח",
    analysis1,
    proposal1,
    JSON.stringify(boq1),
    "2995730841"
  );

  // מכרז 2 - בית ספר אלונים רמת גן
  const analysis2 = `### דוח ניתוח מכרז: בית ספר אלונים רמת גן
הרחבה ושיפוץ בית ספר יסודי אלונים הכולל תוספת 6 כיתות, ממ״ד וספרייה מתקדמת.
סיווג נדרש: ג׳3 לפחות. תקופת ביצוע: 10 חודשים.`;

  const boq2 = [
    {"section": "01", "item": "פירוקים והכנת אתר", "quantity": 1, "unit": "גלובלי", "unitPrice": 85000},
    {"section": "02", "item": "תוספת שלד בטון", "quantity": 400, "unit": "מ\"ק", "unitPrice": 520}
  ];

  const proposal2 = `### הצעת מחיר עבור: מכרז בית ספר אלונים רמת גן
סך הצעתנו הכוללת עומדת על: **890,000 ₪** (לא כולל מע"מ).`;

  insertTender.run(
    "הרחבה ושיפוץ בית ספר יסודי \"אלונים\" רמת גן",
    "1718229000000-tender_sports_hall_netanya.pdf",
    "2026-06-13T10:00:00.000Z",
    "חדש",
    analysis2,
    proposal2,
    JSON.stringify(boq2),
    "2995723323"
  );

  // מכרז 3 - מתחם שורק שלב ב'
  insertTender.run(
    "בניית מתחם מסחרי שורק - שלב ב'",
    "1718229000000-tender_sports_hall_netanya.pdf",
    "2026-06-04T12:00:00.000Z",
    "נותח",
    "ניתוח מתחם מסחרי שורק שלב ב׳ הכולל בניית שטחי מסחר פתוחים, חיפויי פלדה ומערכות אוורור.",
    "הצעת מחיר בשלבים סופיים: סה״כ 3,200,000 ₪",
    JSON.stringify([]),
    "2995723324"
  );

  // מכרז 4 - שכונת נווה זמר
  insertTender.run(
    "עבודות עפר וקירות תומכים - שכונת נווה זמר",
    "1718229000000-tender_sports_hall_netanya.pdf",
    "2026-06-09T09:00:00.000Z",
    "נותח",
    "עבודות עפר וקירות תומכים בשכונת נווה זמר. יישור קו גבולות מגרשים ויציקות קירות דיפון.",
    "הצעת מחיר מוערכת: 450,000 ₪",
    JSON.stringify([]),
    "2995741803"
  );

  // מכרז 5 - בסר 4 קומה 22
  insertTender.run(
    "עבודות גמר ומיזוג אוויר - מגדלי בסר 4 קומה 22",
    "1718229000000-tender_sports_hall_netanya.pdf",
    "2026-05-25T11:00:00.000Z",
    "הוגש",
    "עבודות גמר, מחיצות גבס, תקרות אקוסטיות, פריסת חשמל ומיזוג אוויר במגדל בסר קומה 22.",
    "הוגש בהצלחה: 720,000 ₪",
    JSON.stringify([]),
    "2995723360"
  );

  // מכרז 6 - קמפוס משרדים רעננה
  insertTender.run(
    "מכרז שלד ומעטפת - קמפוס משרדים רעננה",
    "1718228000000-tender_school_dekel.pdf",
    "2026-04-25T16:00:00.000Z",
    "לא זכינו",
    "מכרז רחב שלד ומעטפת קמפוס רעננה. ההצעה הוגשה על סך 5,400,000 ₪.",
    "הצעה סופית: 5,400,000 ₪. לא זכינו במכרז.",
    JSON.stringify([]),
    "2995731113"
  );

  console.log('Seeding complete.');

  // גיבוי מיידי לענן
  if (db.backupToCloud) {
    try {
      console.log('☁️ Backing up seeded database to Cloud Storage...');
      await db.backupToCloud();
      console.log('☁️ Cloud database backup completed.');
    } catch (e) {
      console.error('☁️ Cloud Storage backup failed:', e.message);
    }
  }
}

// קריאה ראשונית בעת טעינת המודול למקרה שאין פרויקטים כלל
reseedDatabase(false).catch(err => {
  console.error("Error running auto-seed on module import:", err);
});
