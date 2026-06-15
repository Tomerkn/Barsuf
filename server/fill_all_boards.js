/**
 * fill_all_boards_v2.js
 * ממלא כל תא ריק בכל 3 לוחות ברסוף
 * גרסה מתוקנת — ללא שגיאות cv.title
 */

import db from './db.js';

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE";

const BOARDS = {
  PROJECTS:    '5098147203',
  CONTRACTORS: '5098147406',
  DASHBOARD:   '5098147234',
};

async function mondayApi(query, variables = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) { console.error('  API Error:', json.errors[0]?.message); return null; }
  return json.data;
}

async function getBoard(boardId) {
  const data = await mondayApi(`{
    boards(ids: [${boardId}]) {
      name
      columns { id title type }
      items_page(limit: 100) {
        items { id name column_values { id type text value } }
      }
    }
  }`);
  return data?.boards?.[0];
}

async function updateAll(boardId, itemId, colValues) {
  if (Object.keys(colValues).length === 0) return true;
  const data = await mondayApi(
    `mutation($b: ID!, $i: ID!, $c: JSON!) {
       change_multiple_column_values(board_id: $b, item_id: $i, column_values: $c) { id }
     }`,
    { b: boardId, i: String(itemId), c: JSON.stringify(colValues) }
  );
  return !!data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── נתוני פרויקטים ─────────────────────────────────────────────────────────
const PROJ = {
  "2995741804": { client:"משפחת כהן",         price:1950000, budget:1950000, actual:1107000, recv:"2026-05-05", end:"2026-10-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:75, from:"2026-05-01", to:"2026-10-15", boq:true,  notes:"וילה 350 מ\"ר. שלד קומה א׳ 75%. מפקח אישר ברזל. תשלום שלישי התקבל." },
  "2977901166": { client:"משפחת בן דוד",      price:1650000, budget:1650000, actual:502000,  recv:"2026-04-25", end:"2026-09-30", st:"Stuck",   exec:"Stuck",          pri:"Stuck",         prog:36, from:"2026-05-01", to:"2026-09-30", boq:true,  notes:"עיכוב 3 שב׳ — ספק ברזל. ברזל חלופי הוזמן 8.6. חידוש עבודה צפוי 20.6." },
  "2977941656": { client:"משפחת אדרי",        price:3100000, budget:3100000, actual:40000,   recv:"2026-04-10", end:"2027-02-28", st:"Done",    exec:"Working on it", pri:"Working on it", prog:6,  from:"2026-06-10", to:"2027-02-28", boq:true,  notes:"וילה 480 מ\"ר + בריכה. חוזה נחתם 14.4. פתיחת אתר 1.7.2026." },
  "2995744961": { client:"משפחת לוי",         price:2100000, budget:2100000, actual:1100000, recv:"2026-03-15", end:"2026-12-01", st:"Done",    exec:"Working on it", pri:"Working on it", prog:60, from:"2026-03-15", to:"2026-12-01", boq:true,  notes:"שלד הושלם. מערכות חשמל ואינסטלציה 65%. ריצוף הוזמן מראש." },
  "2995768312": { client:"משפחת שמיר",        price:1780000, budget:1780000, actual:22000,   recv:"2026-05-01", end:"2026-11-15", st:"Stuck",   exec:"Stuck",          pri:"Stuck",         prog:5,  from:"2026-05-20", to:"2026-11-15", boq:true,  notes:"עיכוב היתר בנייה — עיריית כפר סבא. צפי קבלת היתר: אמצע יולי 2026." },
  "2995745472": { client:"משפחת שמיר",        price:1780000, budget:1780000, actual:22000,   recv:"2026-05-01", end:"2026-11-15", st:"Stuck",   exec:"Stuck",          pri:"Stuck",         prog:5,  from:"2026-05-20", to:"2026-11-15", boq:true,  notes:"עיכוב היתר בנייה — עיריית כפר סבא. צפי קבלת היתר: אמצע יולי 2026." },
  "2995768315": { client:"משפחת גולן",        price:2650000, budget:2650000, actual:0,       recv:"2026-06-01", end:"2027-04-30", st:"Done",    exec:"Working on it", pri:"Working on it", prog:4,  from:"2026-06-01", to:"2027-04-30", boq:true,  notes:"וילה 400 מ\"ר + גינה. חוזה חתום. פתיחת אתר ספטמבר 2026." },
  "2995730841": { client:"מגדלי הים התיכון",  price:1450000, budget:1450000, actual:0,       recv:"2026-06-12", end:"2026-07-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-07-15", to:"2027-01-15", boq:true,  notes:"מכרז נותח. הצעה בהכנה. 1,450,000 ₪. סיווג ג׳5 נדרש." },
  "2995723323": { client:"עיריית רמת גן",     price:890000,  budget:890000,  actual:0,       recv:"2026-06-13", end:"2026-07-01", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:0, from:"2026-08-01", to:"2027-06-01", boq:false, notes:"מכרז חדש. ניתוח ראשוני הושלם. בחינת כדאיות ממ״ד + ספרייה." },
  "2995723360": { client:"בסר נדל\"ן",         price:720000,  budget:720000,  actual:720000,  recv:"2026-05-25", end:"2026-05-25", st:"Stuck",   exec:"Done",          pri:"Working on it", prog:100,from:"2026-05-25", to:"2026-06-30", boq:true,  notes:"הוגש 25.5. מחכים לתשובה עד 30.6. סיכוי טוב." },
  "2995731113": { client:"גב-ים יזמות",       price:5400000, budget:5400000, actual:5400000, recv:"2026-04-25", end:"2026-05-25", st:"Stuck",   exec:"Done",          pri:"Working on it", prog:100,from:"2026-04-25", to:"2026-05-25", boq:true,  notes:"לא זכינו. המתחרה: 4,980,000 ₪. פחות ב-8%. נבחן עלויות מעטפת." },
  "2977895374": { client:"משפחת אברמוביץ",    price:1600000, budget:1600000, actual:0,       recv:"2025-04-01", end:"2025-05-01", st:"Stuck",   exec:"Done",          pri:"Stuck",         prog:100,from:"2025-04-01", to:"2025-05-01", boq:true,  notes:"הפסד — מחיר גבוה ב-8% ממתחרה. ניתוח לשיפור הצעות עתידיות." },
  "2977941760": { client:"יהלום רות",          price:2200000, budget:2200000, actual:0,       recv:"2025-04-14", end:"2025-05-14", st:"Stuck",   exec:"Done",          pri:"Stuck",         prog:100,from:"2025-04-14", to:"2025-05-14", boq:false, notes:"לקוח בחר קבלן מכר. לשמור קשר ל-2027." },
  // subitems / tasks in the board
  "2995715275": { client:"ברסוף",             price:0,       budget:120000,  actual:0,       recv:"2026-05-01", end:"2026-05-20", st:"Done",    exec:"Done",          pri:"Working on it", prog:100,from:"2026-05-01", to:"2026-05-20", boq:false, notes:"תכנון קונסטרוקציה — הושלם." },
  "2995764706": { client:"ברסוף",             price:0,       budget:85000,   actual:85000,   recv:"2026-05-01", end:"2026-05-25", st:"Done",    exec:"Done",          pri:"Working on it", prog:100,from:"2026-05-01", to:"2026-05-25", boq:false, notes:"חפירה וישור שטח — הושלם." },
  "2995764880": { client:"ברסוף",             price:0,       budget:420000,  actual:420000,  recv:"2026-05-10", end:"2026-06-10", st:"Done",    exec:"Done",          pri:"Working on it", prog:100,from:"2026-05-10", to:"2026-06-10", boq:false, notes:"יציקת כלונסאות ויסודות — הושלם." },
  "2995712596": { client:"ברסוף",             price:0,       budget:350000,  actual:280000,  recv:"2026-06-01", end:"2026-07-10", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:70, from:"2026-06-01", to:"2026-07-10", boq:false, notes:"שלד קומה א׳ — 70% הושלם. יציקת תקרה הבאה: 20.6." },
  "2995741131": { client:"ברסוף",             price:0,       budget:350000,  actual:0,       recv:"2026-07-10", end:"2026-08-20", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-07-10", to:"2026-08-20", boq:false, notes:"שלד קומה ב׳ — טרם התחיל." },
  "2995764711": { client:"ברסוף",             price:0,       budget:35000,   actual:17500,   recv:"2026-06-26", end:"2026-07-14", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:35, from:"2026-06-26", to:"2026-07-14", boq:false, notes:"אינסטלציה וביוב — 35% הושלם." },
  "2995715327": { client:"ברסוף",             price:0,       budget:35000,   actual:7000,    recv:"2026-06-29", end:"2026-07-19", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:20, from:"2026-06-29", to:"2026-07-19", boq:false, notes:"חשמל ותקשורת — 20% הושלם." },
  "2995712598": { client:"ברסוף",             price:0,       budget:20000,   actual:0,       recv:"2026-07-14", end:"2026-07-29", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-07-14", to:"2026-07-29", boq:false, notes:"טיח פנים — טרם התחיל." },
  "2995712601": { client:"ברסוף",             price:0,       budget:20000,   actual:0,       recv:"2026-07-24", end:"2026-08-13", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-07-24", to:"2026-08-13", boq:false, notes:"ריצוף וחיפוי — טרם התחיל." },
  "2995712487": { client:"ברסוף",             price:0,       budget:15000,   actual:0,       recv:"2026-08-18", end:"2026-08-28", st:"Working on it", exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-08-18", to:"2026-08-28", boq:false, notes:"מסירה ושנת בדק — טרם הגיע." },
  // ישנים שהיו בלוח
  "2995730887": { client:"משפחת כהן",         price:1950000, budget:1950000, actual:1107000, recv:"2026-05-05", end:"2026-10-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:75, from:"2026-05-01", to:"2026-10-15", boq:true, notes:"וילה נווה עמל — שלד קומה א׳ בביצוע. (כפול — ראה 2995741804)" },
  "2995765183": { client:"שורק פיתוח",        price:1150000, budget:1150000, actual:667000,  recv:"2026-04-20", end:"2026-08-30", st:"Stuck",   exec:"Stuck",         pri:"Stuck",         prog:42, from:"2026-05-05", to:"2026-08-30", boq:true, notes:"עיכוב 12 ימים — ממצא ארכיאולוגי. אישור רשות עתיקות התקבל. חידוש עבודה." },
  "2995791814": { client:"שורק פיתוח",        price:1150000, budget:1150000, actual:667000,  recv:"2026-04-20", end:"2026-08-30", st:"Stuck",   exec:"Stuck",         pri:"Stuck",         prog:42, from:"2026-05-05", to:"2026-08-30", boq:true, notes:"עיכוב ממצא ארכיאולוגי. חידוש עבודה. ביוב 40% הושלם." },
  "2977897928": { client:"פרויקט כרמי יוסף",  price:1350000, budget:1350000, actual:580000,  recv:"2025-11-01", end:"2026-07-31", st:"Done",    exec:"Working on it", pri:"Working on it", prog:55, from:"2025-11-01", to:"2026-07-31", boq:true, notes:"בית חוף. שלד ומערכות הושלמו. גמרים בביצוע." },
  "2977895372": { client:"מגורים מבשרת ציון", price:980000,  budget:980000,  actual:490000,  recv:"2025-09-01", end:"2026-06-30", st:"Done",    exec:"Working on it", pri:"Working on it", prog:80, from:"2025-09-01", to:"2026-06-30", boq:true, notes:"בית פרטי. גמרים 80%. מסירה מתוכננת ל-30.6." },
  "2995765205": { client:"בסר נדל\"ן",         price:720000,  budget:720000,  actual:720000,  recv:"2026-05-25", end:"2026-05-25", st:"Stuck",   exec:"Done",         pri:"Working on it", prog:100,from:"2026-05-25", to:"2026-06-30", boq:true, notes:"הוגש 25.5. ממתינים לתוצאות." },
  "2977953061": { client:"פנטהאוז הרצליה",    price:4200000, budget:4200000, actual:2100000, recv:"2025-08-01", end:"2026-09-30", st:"Done",    exec:"Working on it", pri:"Working on it", prog:50, from:"2025-08-01", to:"2026-09-30", boq:true, notes:"פנטהאוז. שלד ומערכות הושלמו. גמרים 50% בביצוע." },
  "2977962104": { client:"רמת השרון",         price:1450000, budget:1450000, actual:200000,  recv:"2026-02-01", end:"2026-12-31", st:"Done",    exec:"Working on it", pri:"Working on it", prog:15, from:"2026-02-01", to:"2026-12-31", boq:true, notes:"בית קרקע. יסודות בביצוע." },
  "2977952801": { client:"שוהם",              price:2800000, budget:2800000, actual:1400000, recv:"2025-10-01", end:"2026-10-31", st:"Done",    exec:"Working on it", pri:"Working on it", prog:50, from:"2025-10-01", to:"2026-10-31", boq:true, notes:"וילה + בריכה. שלד הושלם. מערכות בביצוע." },
  "2995765041": { client:"שורק פיתוח",        price:3200000, budget:3200000, actual:0,       recv:"2026-06-04", end:"2026-08-20", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-06-04", to:"2026-08-20", boq:true, notes:"מתחם שורק שלב ב׳. הצעה בשלבים סופיים." },
  "2995741590": { client:"נווה זמר",          price:450000,  budget:450000,  actual:0,       recv:"2026-06-09", end:"2026-07-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-06-09", to:"2026-07-15", boq:true, notes:"עפר וקירות תומכים. ניתוח הושלם. הצעה מוערכת 450,000 ₪." },
  "2995723324": { client:"שורק פיתוח",        price:3200000, budget:3200000, actual:0,       recv:"2026-06-04", end:"2026-08-20", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-06-04", to:"2026-08-20", boq:true, notes:"מתחם שורק שלב ב׳." },
  "2995741803": { client:"נווה זמר",          price:450000,  budget:450000,  actual:0,       recv:"2026-06-09", end:"2026-07-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-06-09", to:"2026-07-15", boq:true, notes:"עפר וקירות תומכים — נווה זמר." },
  "2977895517": { client:"כפר שמריהו",        price:3800000, budget:3800000, actual:1900000, recv:"2025-07-01", end:"2026-08-31", st:"Done",    exec:"Working on it", pri:"Working on it", prog:60, from:"2025-07-01", to:"2026-08-31", boq:true, notes:"וילה פרטית. שלד ומערכות הושלמו. גמרים בביצוע." },
  "2977895518": { client:"מושב עין ורד",      price:1200000, budget:1200000, actual:600000,  recv:"2025-08-15", end:"2026-08-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:50, from:"2025-08-15", to:"2026-08-15", boq:true, notes:"בית פרטי. שלד הושלם. מערכות 50%." },
  "2995722974": { client:"חולון",             price:1450000, budget:1450000, actual:0,       recv:"2026-06-12", end:"2026-07-15", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-07-15", to:"2027-01-15", boq:true, notes:"מגדלי הים התיכון — מכרז." },
  "2977962085": { client:"ברסוף",             price:0,       budget:10000,   actual:0,       recv:"2026-01-01", end:"2026-12-31", st:"Done",    exec:"Working on it", pri:"Working on it", prog:0,  from:"2026-01-01", to:"2026-12-31", boq:false, notes:"משימה כללית." },
};

async function fillProjectsBoard() {
  console.log('\n══ לוח 1: ניהול פרויקטים ומכרזים ══');
  const board = await getBoard(BOARDS.PROJECTS);
  if (!board) return;

  for (const item of board.items_page.items) {
    const d = PROJ[item.id] || {
      client: item.name.split('—')[0].trim().substring(0, 30),
      price: 1000000, budget: 1000000, actual: 0,
      recv: "2026-01-01", end: "2026-12-31",
      st: "Done", exec: "Working on it", pri: "Working on it",
      prog: 0, from: "2026-01-01", to: "2026-12-31",
      boq: true, notes: "פרויקט בביצוע. פרטים נוספים בהכנה."
    };

    const updates = {
      'color_mm44vp0m':     { label: d.st },
      'date_mm44fzgd':      { date: d.end },
      'date_mm442yfk':      { date: d.recv },
      'text_mm44nn33':      d.client,
      'numeric_mm44271k':   d.price,
      'boolean_mm44s408':   { checked: d.boq ? 'true' : 'false' },
      'text_mm44rg53':      d.notes,
      'color_mm4apv46':     { label: d.exec },
      'numeric_mm4atjdw':   d.prog,
      'timerange_mm4ay3fq': { from: d.from, to: d.to },
      'color_mm4adxpe':     { label: d.pri },
      'numeric_mm4a8dj9':   d.budget,
      'numeric_mm4aj33p':   d.actual,
    };

    const ok = await updateAll(BOARDS.PROJECTS, item.id, updates);
    const flag = PROJ[item.id] ? '✅' : '⚠️';
    console.log(`  ${flag} ${item.id} — ${item.name.substring(0,40)} → ${ok ? 'עודכן' : 'שגיאה'}`);
    await sleep(450);
  }
}

async function fillContractorsBoard() {
  console.log('\n══ לוח 2: ניהול קבלני משנה ══');
  const board = await getBoard(BOARDS.CONTRACTORS);
  if (!board) return;

  // בנה מפת עמודות
  const colMap = {};
  board.columns.forEach(c => { colMap[c.id] = { title: c.title, type: c.type }; });
  console.log('  עמודות:', board.columns.map(c => `${c.id}=${c.title}`).join(' | '));

  const dbContractors = db.prepare('SELECT * FROM contractors').all();

  for (const item of board.items_page.items) {
    const dbC = dbContractors.find(c =>
      c.monday_id === item.id ||
      c.name.includes(item.name.substring(0, 8)) ||
      item.name.includes(c.name.substring(0, 8))
    );

    const updates = {};
    item.column_values.forEach(cv => {
      if (cv.text && cv.text.trim() !== '') return; // כבר מאויש

      const col = colMap[cv.id] || {};
      const titleHe = (col.title || '').toLowerCase();
      const type = cv.type;

      // מצא נתוני הוצאות מהקבלן
      const totalSpent = dbC
        ? db.prepare('SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE contractor_id=?').get(dbC.id).t
        : 0;
      const projCount = dbC
        ? db.prepare('SELECT count(DISTINCT project_id) as c FROM expenses WHERE contractor_id=?').get(dbC.id).c
        : 0;

      switch (type) {
        case 'phone':
          if (dbC?.phone) updates[cv.id] = { phone: dbC.phone, countryShortName: 'IL' };
          break;
        case 'email':
          if (dbC?.email) updates[cv.id] = { email: dbC.email, text: dbC.email };
          break;
        case 'text':
          if (titleHe.includes('תחום') || titleHe.includes('התמחות') || titleHe.includes('specializ')) {
            updates[cv.id] = dbC?.specialization || 'בנייה כללית';
          } else if (titleHe.includes('פרויקט') || titleHe.includes('project')) {
            updates[cv.id] = projCount > 0 ? `${projCount} פרויקטים פעילים` : 'ממתין לשיבוץ';
          } else if (titleHe.includes('הערות') || titleHe.includes('notes') || titleHe.includes('note')) {
            updates[cv.id] = dbC
              ? `${dbC.specialization}. סה"כ עבודות: ${Math.round(totalSpent).toLocaleString('he-IL')} ₪. אמין ומקצועי.`
              : 'קבלן חיצוני. יש לאמת אחרי עבודה ראשונה.';
          } else if (titleHe.includes('כתובת') || titleHe.includes('address')) {
            updates[cv.id] = 'אזור השרון';
          } else if (titleHe.includes('שם') || titleHe.includes('name')) {
            updates[cv.id] = dbC?.name || item.name;
          } else {
            updates[cv.id] = dbC?.specialization || 'כללי';
          }
          break;
        case 'color':
        case 'status':
          updates[cv.id] = { label: 'Done' };
          break;
        case 'numbers':
          if (titleHe.includes('סכום') || titleHe.includes('הצעה') || titleHe.includes('proposal')) {
            updates[cv.id] = Math.round(totalSpent) || 50000;
          } else if (titleHe.includes('דירוג') || titleHe.includes('rating')) {
            updates[cv.id] = 9;
          } else {
            updates[cv.id] = Math.round(totalSpent) || 0;
          }
          break;
        case 'date':
          updates[cv.id] = { date: '2026-01-15' };
          break;
        case 'boolean':
          updates[cv.id] = { checked: 'true' };
          break;
        case 'link':
          updates[cv.id] = { url: 'https://barsuf-866412886831.europe-west1.run.app', text: 'ברסוף מערכת' };
          break;
      }
    });

    if (Object.keys(updates).length === 0) {
      console.log(`  ✅ ${item.id} — ${item.name} — כבר מלא`);
      continue;
    }

    const ok = await updateAll(BOARDS.CONTRACTORS, item.id, updates);
    console.log(`  ${ok ? '✅' : '❌'} ${item.id} — ${item.name} — עדכן ${Object.keys(updates).length} שדות`);
    await sleep(400);
  }
}

async function fillDashboardBoard() {
  console.log('\n══ לוח 3: דאשבורד ניהולי ══');
  const board = await getBoard(BOARDS.DASHBOARD);
  if (!board) return;

  const colMap = {};
  board.columns.forEach(c => { colMap[c.id] = { title: c.title, type: c.type }; });
  console.log('  עמודות:', board.columns.map(c => `${c.id}=${c.title}`).join(' | '));

  // נתוני דאשבורד מה-DB
  const totalBudget   = db.prepare("SELECT COALESCE(SUM(total_amount),0) as t FROM budgets").get().t;
  const totalExpenses = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM expenses").get().t;
  const totalIncomes  = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM incomes").get().t;
  const activeCount   = db.prepare("SELECT count(*) as c FROM projects WHERE status IN ('תקין','עיכוב')").get().c;
  const delayedCount  = db.prepare("SELECT count(*) as c FROM projects WHERE status='עיכוב'").get().c;
  const openWarranty  = db.prepare("SELECT count(*) as c FROM warranty_tickets WHERE status IN ('פתוח','בטיפול')").get().c;
  const pendingOrders = db.prepare("SELECT count(*) as c FROM orders WHERE status != 'סופק'").get().c;
  const activeTasks   = db.prepare("SELECT count(*) as c FROM tasks WHERE progress < 100").get().c;
  const profit        = totalIncomes - totalExpenses;

  const today = new Date().toISOString().split('T')[0];

  for (const item of board.items_page.items) {
    const updates = {};

    item.column_values.forEach(cv => {
      if (cv.text && cv.text.trim() !== '') return;

      const col = colMap[cv.id] || {};
      const titleHe = (col.title || '').toLowerCase();
      const type = cv.type;

      switch (type) {
        case 'numbers':
          if (titleHe.includes('תקציב') || titleHe.includes('budget'))           updates[cv.id] = Math.round(totalBudget);
          else if (titleHe.includes('הוצאות') || titleHe.includes('expens'))     updates[cv.id] = Math.round(totalExpenses);
          else if (titleHe.includes('הכנסות') || titleHe.includes('income'))     updates[cv.id] = Math.round(totalIncomes);
          else if (titleHe.includes('רווח') || titleHe.includes('profit'))       updates[cv.id] = Math.round(profit);
          else if (titleHe.includes('פרויקט') || titleHe.includes('project'))    updates[cv.id] = activeCount;
          else if (titleHe.includes('עיכוב') || titleHe.includes('delay'))       updates[cv.id] = delayedCount;
          else if (titleHe.includes('אחריות') || titleHe.includes('warrant'))    updates[cv.id] = openWarranty;
          else if (titleHe.includes('הזמנ') || titleHe.includes('order'))        updates[cv.id] = pendingOrders;
          else if (titleHe.includes('משימ') || titleHe.includes('task'))         updates[cv.id] = activeTasks;
          else                                                                     updates[cv.id] = 0;
          break;
        case 'color':
        case 'status':
          updates[cv.id] = { label: delayedCount > 0 ? 'Stuck' : 'Done' };
          break;
        case 'text':
          if (titleHe.includes('הערות') || titleHe.includes('notes'))
            updates[cv.id] = `${activeCount} פרויקטים פעילים | ${delayedCount} בעיכוב | ${openWarranty} קריאות אחריות | עודכן ${new Date().toLocaleDateString('he-IL')}`;
          else
            updates[cv.id] = `עודכן ${new Date().toLocaleDateString('he-IL')}`;
          break;
        case 'date':
          updates[cv.id] = { date: today };
          break;
        case 'boolean':
          updates[cv.id] = { checked: 'true' };
          break;
      }
    });

    if (Object.keys(updates).length === 0) {
      console.log(`  ✅ ${item.id} — ${item.name} — כבר מלא`);
      continue;
    }

    const ok = await updateAll(BOARDS.DASHBOARD, item.id, updates);
    console.log(`  ${ok ? '✅' : '❌'} ${item.id} — ${item.name} — עדכן ${Object.keys(updates).length} שדות`);
    await sleep(400);
  }
}

async function main() {
  console.log('מאייש את כל 3 לוחות ברסוף...\n');
  await fillProjectsBoard();
  await sleep(1500);
  await fillContractorsBoard();
  await sleep(1500);
  await fillDashboardBoard();
  console.log('\nהכל עודכן.');
}

main().catch(console.error);
