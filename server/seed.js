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

  console.log('Seeding database with rich presentation data...');

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
    db.prepare("PRAGMA foreign_keys = ON").run();
  }

  // --- קבלנים לדוגמה ---
  const insertContractor = db.prepare("INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)");
  const c1 = insertContractor.run("סולל בונה תשתיות בע\"מ", "שלד ועבודות עפר", "03-5678900", "contacts@solel-boneh.co.il");
  const c2 = insertContractor.run("אלקטרה מערכות בע\"מ", "חשמל ומיזוג אוויר", "09-9876543", "system@electra.co.il");
  const c3 = insertContractor.run("גלובל זרימה בע\"מ", "אינסטלציה וכיבוי אש", "052-4443322", "office@global-flow.co.il");
  const c4 = insertContractor.run("דקו גמרים איכותיים", "גמרים וצבע", "054-5556677", "finish@deco-gmar.co.il");
  const c5 = insertContractor.run("אור חיפויים ושיש", "ריצוף וחיפוי", "050-8889900", "info@or-marble.co.il");
  const c6 = insertContractor.run("דלתות חמדיה בע\"מ", "נגרות ודלתות", "04-6667788", "sales@hamadia.co.il");

  const contId1 = c1.lastInsertRowid;
  const contId2 = c2.lastInsertRowid;
  const contId3 = c3.lastInsertRowid;
  const contId4 = c4.lastInsertRowid;
  const contId5 = c5.lastInsertRowid;
  const contId6 = c6.lastInsertRowid;

  // --- פרויקטים לדוגמה ---
  const insertProject = db.prepare("INSERT INTO projects (name, location, end_date, status, analysis, proposal, boq_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  const p1 = insertProject.run(
    "מגדלי הים התיכון - הרצליה", 
    "הרצליה פיתוח", 
    "2026-10-31", 
    "תקין",
    "פרויקט יוקרה הכולל 3 מגדלי מגורים קו ראשון לים עם מפרט טכני גבוה במיוחד.",
    null,
    null
  );
  
  const p2 = insertProject.run(
    "קמפוס הייטק ירושלים", 
    "גבעת רם, ירושלים", 
    "2027-04-30", 
    "תקין",
    "קמפוס משרדים מתקדם של 4 בניינים בתקן ירוק לבנייה משרדית ומעבדות.",
    null,
    null
  );

  const p3 = insertProject.run(
    "מתחם מגורים כרמי גת", 
    "קרית גת", 
    "2026-08-15", 
    "תקין",
    "בניית 12 בנייני בוטיק, סה\"כ 180 יחידות דיור במסגרת מחיר למשתכן.",
    null,
    null
  );

  const p4 = insertProject.run(
    "מרכז לוגיסטי שפלה", 
    "אזור תעשייה חבל מודיעין", 
    "2026-12-31", 
    "עיכוב",
    "מרלו\"ג אוטומטי מתקדם המשלב מערכות אחסון רובוטיות בגובה.",
    null,
    null
  );

  const p5 = insertProject.run(
    "וילה יוקרתית, קיסריה", 
    "שכונה 13, קיסריה", 
    "2026-04-01", 
    "תקין",
    "וילה פרטית יוקרתית הכוללת בריכת גלישה ומפרט אדריכלי מורכב.",
    null,
    null
  );

  const projId1 = p1.lastInsertRowid;
  const projId2 = p2.lastInsertRowid;
  const projId3 = p3.lastInsertRowid;
  const projId4 = p4.lastInsertRowid;
  const projId5 = p5.lastInsertRowid;

  // --- סעיפי תקציב (Budgets) ---
  const insertBudget = db.prepare("INSERT INTO budgets (project_id, category, total_amount) VALUES (?, ?, ?)");
  
  // פרויקט 1 - מגדלי הרצליה
  const b1_1 = insertBudget.run(projId1, "עבודות שלד ופיתוח", 18000000).lastInsertRowid;
  const b1_2 = insertBudget.run(projId1, "חשמל ותקשורת", 8000000).lastInsertRowid;
  const b1_3 = insertBudget.run(projId1, "אינסטלציה ומיזוג", 7000000).lastInsertRowid;
  const b1_4 = insertBudget.run(projId1, "גמרים וצבע", 5000000).lastInsertRowid;
  const b1_5 = insertBudget.run(projId1, "ריצוף וחיפוי", 4000000).lastInsertRowid;

  // פרויקט 2 - קמפוס ירושלים
  const b2_1 = insertBudget.run(projId2, "עבודות שלד ופיתוח", 35000000).lastInsertRowid;
  const b2_2 = insertBudget.run(projId2, "חשמל ותקשורת", 20000000).lastInsertRowid;
  const b2_3 = insertBudget.run(projId2, "אינסטלציה ומיזוג", 15000000).lastInsertRowid;
  const b2_4 = insertBudget.run(projId2, "גמרים וריצוף", 15000000).lastInsertRowid;

  // פרויקט 3 - כרמי גת
  const b3_1 = insertBudget.run(projId3, "עבודות שלד ופיתוח", 10000000).lastInsertRowid;
  const b3_2 = insertBudget.run(projId3, "חשמל ותקשורת", 5000000).lastInsertRowid;
  const b3_3 = insertBudget.run(projId3, "אינסטלציה ומיזוג", 5000000).lastInsertRowid;
  const b3_4 = insertBudget.run(projId3, "גמרים וצבע", 4000000).lastInsertRowid;
  const b3_5 = insertBudget.run(projId3, "ריצוף וחיפוי", 4000000).lastInsertRowid;

  // פרויקט 4 - מרלו"ג שפלה
  const b4_1 = insertBudget.run(projId4, "עבודות שלד ופיתוח", 12000000).lastInsertRowid;
  const b4_2 = insertBudget.run(projId4, "חשמל ותקשורת", 4000000).lastInsertRowid;
  const b4_3 = insertBudget.run(projId4, "אינסטלציה ומיזוג", 5000000).lastInsertRowid;
  const b4_4 = insertBudget.run(projId4, "גמרים וצבע", 2000000).lastInsertRowid;

  // פרויקט 5 - וילה קיסריה
  const b5_1 = insertBudget.run(projId5, "עבודות שלד ופיתוח", 2500000).lastInsertRowid;
  const b5_2 = insertBudget.run(projId5, "חשמל ותקשורת", 800000).lastInsertRowid;
  const b5_3 = insertBudget.run(projId5, "אינסטלציה ומיזוג", 700000).lastInsertRowid;
  const b5_4 = insertBudget.run(projId5, "גמרים וצבע", 1500000).lastInsertRowid;

  // --- הוצאות (Expenses) ---
  const insertExpense = db.prepare("INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)");
  
  // פרויקט 1 הוצאות
  insertExpense.run(projId1, b1_1, contId1, 12000000, "2025-07-20", "חשבון חלקי 1 - עבודות שלד ויסודות");
  insertExpense.run(projId1, b1_1, contId1, 5800000, "2025-11-15", "חשבון גמר שלד וממ\"דים - 15 קומות");
  insertExpense.run(projId1, b1_2, contId2, 3000000, "2026-01-10", "פריסת כבלי מתח וחשמל ראשיים באתר");
  insertExpense.run(projId1, b1_2, contId2, 1500000, "2026-04-05", "התקנת ארונות חשמל ולוחות חלוקה");
  insertExpense.run(projId1, b1_3, contId3, 2500000, "2025-12-05", "הנחת צנרת מים וניקוז ראשית בבניין א'");
  insertExpense.run(projId1, b1_3, contId3, 700000, "2026-03-20", "התקנת משאבות מים ומערכות ספרינקלרים");
  insertExpense.run(projId1, b1_4, contId4, 2000000, "2026-02-15", "עבודות טיח וגמר קירות פנים");
  insertExpense.run(projId1, b1_5, contId5, 1000000, "2026-05-10", "רכישה ואספקה של שיש וחיפוי ללובי כניסה");

  // פרויקט 2 הוצאות
  insertExpense.run(projId2, b2_1, contId1, 18500000, "2025-12-01", "חפירה, דיפון ויציקת רפסודת חניון תת-קרקעי");
  insertExpense.run(projId2, b2_2, contId2, 500000, "2026-02-15", "חיבור זמני לחשמל והנחת תשתיות ראשוניות");

  // פרויקט 3 הוצאות
  insertExpense.run(projId3, b3_1, contId1, 10000000, "2025-08-01", "גמר שלד מלא לכל 12 הבניינים");
  insertExpense.run(projId3, b3_2, contId2, 4900000, "2025-12-10", "חשבון סופי מערכות חשמל ותקשורת בדירות");
  insertExpense.run(projId3, b3_3, contId3, 4800000, "2026-01-20", "מערכות אינסטלציה וחיבור לרשת הביוב העירונית");
  insertExpense.run(projId3, b3_4, contId4, 3800000, "2026-04-15", "צביעה וגמר טיח בדירות ובשטחים משותפים");
  insertExpense.run(projId3, b3_5, contId5, 3700000, "2026-05-02", "עבודות ריצוף דירות וחדרי מדרגות");

  // פרויקט 4 הוצאות
  insertExpense.run(projId4, b4_1, contId1, 5500000, "2026-02-10", "עבודות עפר ויסודות בטון מיוחדים למרלו\"ג");
  insertExpense.run(projId4, b4_1, contId1, 1500000, "2026-04-18", "חריגה בתשלום שלד עקב התייקרות פלדה וברזל");

  // פרויקט 5 הוצאות
  insertExpense.run(projId5, b5_1, contId1, 2500000, "2025-09-10", "שלד בניין שלם כולל מרתף ובריכה");
  insertExpense.run(projId5, b5_2, contId2, 800000, "2025-11-05", "חשבון סופי חשמל ומערכות בית חכם");
  insertExpense.run(projId5, b5_3, contId3, 700000, "2025-11-20", "צנרת מים ומיזוג אוויר VRF");
  insertExpense.run(projId5, b5_4, contId4, 1200000, "2026-01-15", "עבודות נגרות, מטבח וטיח דקורטיבי");
  insertExpense.run(projId5, b5_4, contId5, 1000000, "2026-03-01", "ריצוף פנים, חיפוי בריכה ופיתוח חוץ");

  // --- הכנסות (Incomes) ---
  const insertIncome = db.prepare("INSERT INTO incomes (project_id, amount, date, description) VALUES (?, ?, ?, ?)");
  
  // פרויקט 1 הכנסות
  insertIncome.run(projId1, 10000000, "2025-06-01", "מקדמת פרויקט מאת היזם");
  insertIncome.run(projId1, 15000000, "2025-12-15", "אישור אבן דרך 1 - גמר עבודות שלד");
  insertIncome.run(projId1, 9000000, "2026-04-10", "אישור אבן דרך 2 - התקנת מערכות בניין");

  // פרויקט 2 הכנסות
  insertIncome.run(projId2, 20000000, "2025-10-01", "מקדמת תחילת עבודה ויזום פרויקט");
  insertIncome.run(projId2, 12000000, "2026-03-15", "אישור אבן דרך - יציקת יסודות חניון תת קרקעי");

  // פרויקט 3 הכנסות
  insertIncome.run(projId3, 8000000, "2025-04-10", "מקדמת פרויקט כרמי גת");
  insertIncome.run(projId3, 12000000, "2025-09-05", "חשבון מאושר 1 - סיום שלד");
  insertIncome.run(projId3, 11000000, "2026-02-28", "חשבון מאושר 2 - גמרים פנים וחיפוי");

  // פרויקט 4 הכנסות
  insertIncome.run(projId4, 5000000, "2026-01-15", "מקדמה ראשונית - הקמת מרלו\"ג שפלה");

  // פרויקט 5 הכנסות
  insertIncome.run(projId5, 2000000, "2025-08-01", "מקדמה תחילת עבודה וילה קיסריה");
  insertIncome.run(projId5, 3000000, "2025-12-01", "אישור חשבון גמר שלד ומעטפת");
  insertIncome.run(projId5, 1800000, "2026-03-15", "אישור גמר עבודה ומסירת מפתח ללקוח");

  // --- הזמנות רכש (Orders) ---
  const insertOrder = db.prepare("INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)");
  
  // פרויקט 1 הזמנות
  insertOrder.run(projId1, "חדרה בטון", "אספקת בטון ב-30 - 500 קוב", 185000, "2025-07-05", "מאושר");
  insertOrder.run(projId1, "אבן קיסר", "משטחי שיש דגם 5110 למטבחים במגדל א'", 220000, "2026-05-02", "פתוח");
  insertOrder.run(projId1, "ליבר סיסטמס", "מערכות פיגומים וציוד תמיכה ליציקה", 45000, "2025-06-12", "מאושר");

  // פרויקט 2 הזמנות
  insertOrder.run(projId2, "אלומניום קונסטרוקציות", "פרופילים וקירות מסך זכוכית כפולה", 4500000, "2026-02-10", "ממתין לאישור");
  insertOrder.run(projId2, "יהודה פלדות", "ברזל זיון לבניין - 120 טון", 380000, "2025-11-20", "מאושר");

  // פרויקט 3 הזמנות
  insertOrder.run(projId3, "דלתות חמדיה", "דלתות פנים מעוצבות לכל 180 הדירות", 160000, "2026-01-15", "מאושר");
  insertOrder.run(projId3, "סופר קרמיקה", "ריצוף גרניט פורצלן 80x80 כולל חיפוי", 320000, "2025-11-05", "מאושר");

  // --- יומני עבודה יומיים (Daily Logs) ---
  const insertLog = db.prepare("INSERT INTO daily_logs (project_id, date, manager_name, weather, workers_count, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  // פרויקט 1
  insertLog.run(projId1, "2026-06-11", "אבי כהן", "בהיר וחם", 42, "בוצעה יציקת עמודים תומכים בקומה 18. הכל התנהל ללא תקלות. הגיע משלוח הברזל המתוכנן.", "");
  insertLog.run(projId1, "2026-06-12", "אבי כהן", "חם מאוד", 38, "עבודות טיח וגמר בדירות קומות 10-12. מפקח הבטיחות ביקר באתר ואישר את רשתות ההגנה החדשות.", "");
  insertLog.run(projId1, "2026-06-13", "אבי כהן", "נוח", 45, "התקנת תשתיות אינסטלציה בבניין ב' - קומות 5-7. צוותי החשמל עבדו על השחלת חוטים ראשית.", "");

  // פרויקט 2
  insertLog.run(projId2, "2026-06-12", "משה לוי", "בהיר", 55, "יציקת רפסודה ראשית לבניין ג'. 80 מערבלי בטון עבדו בסבב. מהנדס האתר אישר את הזיון.", "");
  insertLog.run(projId2, "2026-06-13", "משה לוי", "בהיר", 50, "עבודות חפירה ודיפון לשלב ד'. צוותי הקידוח עובדים לפי תוכנית הקידוחים המאושרת.", "");

  // --- קריאות שירות (Warranty Tickets) ---
  const insertTicket = db.prepare("INSERT INTO warranty_tickets (project_id, client_name, phone, apartment, issue_description, status, open_date, close_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  
  // פרויקט 3 (כרמי גת)
  insertTicket.run(projId3, "רונית מילר", "052-9998877", "בניין 4, דירה 12", "סדק קל מעל הטיח במסדרון הכניסה וצורך בתיקון צבע מקומי", "בטיפול", "2026-06-01", null);
  insertTicket.run(projId3, "ישראל ישראלי", "050-1112233", "בניין 2, דירה 3", "רטיבות קלה בפינת חדר שינה הורים, כנראה מאיטום חלון לא תקין", "פתוח", "2026-06-10", null);
  insertTicket.run(projId3, "שמעון כהן", "054-2223344", "בניין 1, דירה 8", "איזון דלת ממ\"ד לא תקין, הדלת נסגרת בקושי רב", "סגור", "2026-05-15", "2026-05-20");

  // --- משימות גאנט (Tasks) ---
  const insertTask = db.prepare("INSERT INTO tasks (project_id, name, start_date, end_date, progress) VALUES (?, ?, ?, ?, ?)");
  
  // פרויקט 1
  insertTask.run(projId1, "עבודות עפר וחפירה", "2025-05-01", "2025-06-15", 100);
  insertTask.run(projId1, "ביסוס ויציקת יסודות", "2025-06-16", "2025-08-30", 100);
  insertTask.run(projId1, "בניית שלד קומות 1-15", "2025-09-01", "2026-03-31", 100);
  insertTask.run(projId1, "עבודות אינסטלציה ומערכות", "2026-04-01", "2026-07-31", 80);
  insertTask.run(projId1, "גמרים, ריצוף וטיח", "2026-05-01", "2026-09-30", 50);
  insertTask.run(projId1, "פיתוח סביבתי ומסירה", "2026-10-01", "2026-10-31", 0);

  // פרויקט 2
  insertTask.run(projId2, "פינוי, עפר וחפירות עמוקות", "2025-10-01", "2025-12-15", 100);
  insertTask.run(projId2, "הקמת חניון תת-קרקעי", "2025-12-16", "2026-03-31", 100);
  insertTask.run(projId2, "שלד בניינים א' ו-ב'", "2026-04-01", "2026-10-30", 60);
  insertTask.run(projId2, "שלד בניינים ג' ו-ד'", "2026-05-01", "2026-12-31", 30);
  insertTask.run(projId2, "עבודות מעטפת ואלומיניום", "2026-11-01", "2027-02-28", 0);

  // פרויקט 3
  insertTask.run(projId3, "עבודות עפר ויסודות", "2025-04-15", "2025-06-30", 100);
  insertTask.run(projId3, "שלד ומעטפת בניינים 1-12", "2025-07-01", "2025-11-30", 100);
  insertTask.run(projId3, "עבודות איטום ומערכות בניין", "2025-11-01", "2026-02-15", 100);
  insertTask.run(projId3, "עבודות ריצוף, צבע וגמר בדירות", "2026-02-01", "2026-06-30", 95);
  insertTask.run(projId3, "פיתוח שטח, כבישים ומסירות", "2026-06-01", "2026-08-15", 40);

  // --- מכרזים מנותחים (Tenders) ---
  const insertTender = db.prepare("INSERT INTO tenders (name, filename, upload_date, status, analysis, proposal, boq_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  // מכרז 1
  const analysis1 = `### דוח ניתוח מכרז: בית ספר יסודי "דקל" רחובות
  
**1. תמצית המכרז**
הקמת מבנה בית ספר חדש בן 3 קומות הכולל 18 כיתות לימוד, מעבדות, ספרייה, משרדי הנהלה ואולם התכנסות.
  
**2. תנאי סף עיקריים**
* סיווג קבלני נדרש: ג'5 (בנייה) לפחות.
* ניסיון קודם מוכח בבניית מוסדות חינוך או מבני ציבור בשטח של לפחות 3,000 מ"ר ב-5 השנים האחרונות.
* ערבות מכרז: 250,000 ₪ בתוקף למשך 90 ימים.
  
**3. לוחות זמנים ומפתח מסירה**
* תקופת ביצוע: 18 חודשים קלנדריים מיום קבלת צו התחלת עבודה.
* קנס פיגורים: 5,000 ₪ לכל יום איחור במסירה.
  
**4. ניתוח סיכונים והמלצות**
* **סיכון גיאוטכני:** קיימת דרישה לביסוס עמוק עקב סוג הקרקע באזור. יש לקחת בחשבון עלויות קידוח נוספות.
* **הצמדות:** הצמדה למדד תשומות הבנייה רק החל מהחודש ה-6 לביצוע.
* **המלצה:** להגיש הצעה! המרווחים הפיננסיים תואמים את יכולת הביצוע של בארסוף.`;

  const proposal1 = `### הצעת מחיר עבור: מכרז בית ספר "דקל" רחובות
  
לכבוד: עיריית רחובות - ועדת המכרזים
מאת: בארסוף הנדסה ובנייה בע"מ
  
אנו שמחים להגיש את הצעתנו המקצועית והכספית להקמת בית הספר היסודי "דקל" ברחובות.
  
**1. הצעה כספית כוללת**
סך כל הצעתנו לביצוע הפרויקט על פי כתב הכמויות המצורף עומדת על: **11,830,000 ₪** (לא כולל מע"מ).
  
**2. צוות מפתח וניהול הפרויקט**
* מנהל פרויקט מוצע: אינג' ירון לוי, בעל 15 שנות ניסיון בניהול פרויקטי בנייה ציבוריים.
* מנהל עבודה ראשי באתר: מר דוד אברהם, בעל הסמכה וניסיון של 12 שנים בבניית בתי ספר.
  
**3. מתודולוגיית ביצוע**
הבנייה תבוצע בשלושה שלבים מקבילים לקיצור לוחות הזמנים:
* שלב א': עבודות ביסוס ושלד קונסטרוקציה (חודשים 1-7)
* שלב ב': מערכות, איטום וחלוקה פנימית (חודשים 8-13)
* שלב ג': גמרים, פיתוח שטח ונוף, מסירה ומבחני הפעלה (חודשים 14-18)`;

  const boq1 = [
    {"section": "01", "item": "עבודות הכנה, עפר וחפירה", "quantity": 1200, "unit": "מ\"ק", "unitPrice": 90},
    {"section": "02", "item": "עבודות ביסוס, שלד בטון מזוין וממ\"דים", "quantity": 3800, "unit": "מ\"ק", "unitPrice": 480},
    {"section": "03", "item": "מערכות אינסטלציה, מים וכיבוי אש", "quantity": 1, "unit": "גלובלי", "unitPrice": 850000},
    {"section": "04", "item": "חשמל, תקשורת ומתח נמוך", "quantity": 1, "unit": "גלובלי", "unitPrice": 1200000},
    {"section": "05", "item": "מיזוג אוויר מרכזי ואוורור", "quantity": 1, "unit": "גלובלי", "unitPrice": 950000},
    {"section": "06", "item": "עבודות אלומיניום, חלונות וקירות מסך", "quantity": 420, "unit": "מ\"ר", "unitPrice": 1400},
    {"section": "07", "item": "ריצוף וחיפויי קרמיקה פנים וחוץ", "quantity": 2500, "unit": "מ\"ר", "unitPrice": 220},
    {"section": "08", "item": "עבודות גמר, טיח, צבע ותקרות אקוסטיות", "quantity": 1, "unit": "גלובלי", "unitPrice": 1100000},
    {"section": "09", "item": "פיתוח שטח, גינון, גדרות ומגרשי ספורט", "quantity": 1, "unit": "גלובלי", "unitPrice": 1450000}
  ];

  insertTender.run(
    "מכרז בית ספר דקל - רחובות.pdf",
    "1718228000000-tender_school_dekel.pdf",
    "2026-06-10T12:00:00.000Z",
    "נותח",
    analysis1,
    proposal1,
    JSON.stringify(boq1)
  );

  // מכרז 2
  const analysis2 = `### דוח ניתוח מכרז: אולם ספורט עירוני "מרום" נתניה
  
**1. תמצית המכרז**
הקמת אולם ספורט רב-תכליתי הכולל מגרש כדורסל תקני, טריבונות ל-500 צופים, מלתחות, חדרי סטודיו ושטחי שירות.
  
**2. תנאי סף עיקריים**
* סיווג קבלני נדרש: ג'4 לפחות.
* ערבות מכרז: 180,000 ₪ בתוקף ל-90 יום.
  
**3. נקודות מפתח לביצוע**
* מפתח ביצוע מיוחד: קירוי הגג באמצעות קונסטרוקציית פלדה מורכבת במפתחים גדולים. דורש מיומנות הנפה מיוחדת וקבלן משנה מומחה לפלדה.
* תקופת ביצוע: 14 חודשים.`;

  const boq2 = [
    {"section": "01", "item": "הכנת אתר, חפירה ופינוי עודפי עפר", "quantity": 900, "unit": "מ\"ק", "unitPrice": 85},
    {"section": "02", "item": "יסודות ועמודי בטון מזוין", "quantity": 1400, "unit": "מ\"ק", "unitPrice": 520},
    {"section": "03", "item": "קונסטרוקציית פלדה ראשית לגג במפתח גדול", "quantity": 65, "unit": "טון", "unitPrice": 12500},
    {"section": "04", "item": "חיפוי וקירוי גג פנלים מבודדים כולל איטום", "quantity": 1200, "unit": "מ\"ר", "unitPrice": 180},
    {"section": "05", "item": "פרקט ספורט איכותי מעץ מייפל תקני FIBA", "quantity": 800, "unit": "מ\"ר", "unitPrice": 450},
    {"section": "06", "item": "מערכות מיזוג אוויר ומפוחים לאולם הגדול", "quantity": 1, "unit": "גלובלי", "unitPrice": 680000},
    {"section": "07", "item": "מערכות חשמל ותאורת ספורט מבוקרת", "quantity": 1, "unit": "גלובלי", "unitPrice": 750000},
    {"section": "08", "item": "גמרים, מחיצות מלתחות וכלים סניטריים", "quantity": 1, "unit": "גלובלי", "unitPrice": 550000}
  ];

  insertTender.run(
    "מכרז אולם ספורט מרום - נתניה.pdf",
    "1718229000000-tender_sports_hall_netanya.pdf",
    "2026-06-11T16:00:00.000Z",
    "נותח",
    analysis2,
    null, // ללא הצעה כברירת מחדל כדי שיוכל ללחוץ על הכפתור "הפק הצעה" במצגת
    JSON.stringify(boq2)
  );

  console.log('Seeding complete.');

  // גיבוי מיידי לענן (אם קיים תחת db)
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
