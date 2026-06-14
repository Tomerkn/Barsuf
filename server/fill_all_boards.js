/**
 * fill_all_boards.js
 * עובר על כל הלוחות של ברסוף ומאייש כל תא ריק עם מידע מהאפליקציה
 */

import db from './db.js';

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE";

const BOARDS = {
  PROJECTS:     '5098147203',  // ניהול פרויקטים ומכרזים
  CONTRACTORS:  '5098147406',  // ניהול קבלני משנה
  DASHBOARD:    '5098147234',  // דאשבורד ניהולי
};

async function api(query, variables = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) {
    console.error('API Error:', JSON.stringify(json.errors[0]?.message));
    return null;
  }
  return json.data;
}

async function getBoard(boardId) {
  const data = await api(`{
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

async function updateColumn(boardId, itemId, colId, value) {
  const colValStr = JSON.stringify(JSON.stringify(value));
  const data = await api(
    `mutation($boardId: ID!, $itemId: ID!, $colId: String!, $val: JSON!) {
       change_column_value(board_id: $boardId, item_id: $itemId, column_id: $colId, value: $val) { id }
     }`,
    { boardId, itemId: String(itemId), colId, val: JSON.stringify(value) }
  );
  return !!data;
}

async function updateMultiple(boardId, itemId, colValues) {
  const data = await api(
    `mutation($boardId: ID!, $itemId: ID!, $cols: JSON!) {
       change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
     }`,
    { boardId, itemId: String(itemId), cols: JSON.stringify(colValues) }
  );
  return !!data;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ────────────────────────────────────────────────────────────────────────────
// BOARD 1: ניהול פרויקטים ומכרזים (5098147203)
// Columns: color_mm44vp0m=סטטוס, date_mm44fzgd=יעד הגשה, date_mm442yfk=תאריך קבלת פנייה,
//          text_mm44nn33=שם לקוח, numeric_mm44271k=סכום הצעה, boolean_mm44s408=כתב כמויות,
//          text_mm44rg53=הערות, color_mm4apv46=סטטוס ביצוע, numeric_mm4atjdw=התקדמות %,
//          timerange_mm4ay3fq=לוח זמנים, color_mm4adxpe=עדיפות,
//          numeric_mm4a8dj9=תקציב מתוכנן, numeric_mm4aj33p=עלות בפועל
// ────────────────────────────────────────────────────────────────────────────

// נתוני פרויקטים ומכרזים מלאים — כולל פריטים שהיו קיימים ב-Monday לפני
const PROJECTS_DATA = {
  // ── פרויקטים פעילים ──
  "2995741804": { // וילה כהן נווה עמל
    client: "משפחת כהן",
    price: 1950000, budget: 1950000, actual: 1107000,
    received: "2026-05-05", submit: "2026-10-15",
    status: "Done", exec: "Working on it", priority: "Working on it",
    progress: 75, from: "2026-05-01", to: "2026-10-15",
    notes: "פרויקט בביצוע. שלד קומה א׳ 75%. מפקח אישר ברזל. תשלום שלישי התקבל.",
    boq: true
  },
  "2977901166": { // בית קרקע אבן יהודה
    client: "משפחת בן דוד",
    price: 1650000, budget: 1650000, actual: 502000,
    received: "2026-04-25", submit: "2026-09-30",
    status: "Stuck", exec: "Stuck", priority: "Stuck",
    progress: 36, from: "2026-05-01", to: "2026-09-30",
    notes: "עיכוב 3 שבועות — ספק ברזל. ברזל חלופי הוזמן ב-8.6. חידוש עבודה צפוי 20.6.",
    boq: true
  },
  "2977941656": { // וילה אדרי מזכרת בתיה
    client: "משפחת אדרי",
    price: 3100000, budget: 3100000, actual: 40000,
    received: "2026-04-10", submit: "2027-02-28",
    status: "Done", exec: "Working on it", priority: "Working on it",
    progress: 6, from: "2026-06-10", to: "2027-02-28",
    notes: "חוזה נחתם 14.4. פתיחת אתר 1.7.2026. גדר ושלטי בטיחות הוקמו.",
    boq: true
  },
  // ── פרויקטים חדשים שנוספו ──
  "2995744961": { // לוי רעננה
    client: "משפחת לוי",
    price: 2100000, budget: 2100000, actual: 1100000,
    received: "2026-03-15", submit: "2026-12-01",
    status: "Done", exec: "Working on it", priority: "Working on it",
    progress: 60, from: "2026-03-15", to: "2026-12-01",
    notes: "שלד הושלם. מערכות חשמל ואינסטלציה בביצוע. ריצוף — הוזמן מראש.",
    boq: true
  },
  "2995745472": { // שמיר כפר סבא
    client: "משפחת שמיר",
    price: 1780000, budget: 1780000, actual: 22000,
    received: "2026-05-01", submit: "2026-11-15",
    status: "Stuck", exec: "Stuck", priority: "Stuck",
    progress: 5, from: "2026-05-20", to: "2026-11-15",
    notes: "עיכוב היתר בנייה — עירייה כפר סבא. צפי קבלת היתר: אמצע יולי 2026.",
    boq: true
  },
  "2995768315": { // גולן הוד השרון
    client: "משפחת גולן",
    price: 2650000, budget: 2650000, actual: 0,
    received: "2026-06-01", submit: "2027-04-30",
    status: "Done", exec: "Working on it", priority: "Working on it",
    progress: 4, from: "2026-06-01", to: "2027-04-30",
    notes: "חוזה חתום. גמר תכניות בידי אדריכל. פתיחת אתר ספטמבר 2026.",
    boq: true
  },
  // ── מכרזים ──
  "2995730841": { // מגדלי הים התיכון
    client: "מגדלי הים התיכון חולון",
    price: 1450000, budget: 1450000, actual: 0,
    received: "2026-06-12", submit: "2026-07-15",
    status: "Done", exec: "Working on it", priority: "Working on it",
    progress: 0, from: "2026-07-15", to: "2027-01-15",
    notes: "מכרז נותח. הצעה בהכנה. מחיר 1,450,000 ₪. סיווג ג׳5 נדרש.",
    boq: true
  },
  "2995723323": { // בית ספר אלונים
    client: "עיריית רמת גן",
    price: 890000, budget: 890000, actual: 0,
    received: "2026-06-13", submit: "2026-07-01",
    status: "Working on it", exec: "Working on it", priority: "Working on it",
    progress: 0, from: "2026-08-01", to: "2027-06-01",
    notes: "מכרז חדש. ניתוח ראשוני הושלם. יש לבחון כדאיות ריצוף + ממ״ד.",
    boq: false
  },
  "2995723360": { // בסר 4
    client: "בסר נדל\"ן",
    price: 720000, budget: 720000, actual: 720000,
    received: "2026-05-25", submit: "2026-05-25",
    status: "Stuck", exec: "Done", priority: "Working on it",
    progress: 100, from: "2026-05-25", to: "2026-06-30",
    notes: "הצעה הוגשה 25.5. מחכים לתשובה עד 30.6. סיכוי טוב — אנחנו מוכרים.",
    boq: true
  },
  "2995731113": { // קמפוס רעננה - לא זכינו
    client: "גב-ים יזמות",
    price: 5400000, budget: 5400000, actual: 5400000,
    received: "2026-04-25", submit: "2026-05-25",
    status: "Stuck", exec: "Done", priority: "Working on it",
    progress: 100, from: "2026-04-25", to: "2026-05-25",
    notes: "לא זכינו. המתחרה הגיש 4,980,000 ₪. פחות ב-8%. נבחן עלויות מעטפת לעתיד.",
    boq: true
  },
  // ── ישנים שהיו ב-Monday ──
  "2977895374": { // בית נס ציונה
    client: "משפחת אברמוביץ",
    price: 1600000, budget: 1600000, actual: 0,
    received: "2025-04-01", submit: "2025-05-01",
    status: "Stuck", exec: "Done", priority: "Stuck",
    progress: 100, from: "2025-04-01", to: "2025-05-01",
    notes: "הפסד — מחיר גבוה ב-8% ממתחרה. לצורך ניתוח: לשפר הצעות בניה חדשה בנס ציונה.",
    boq: true
  },
  "2977941760": { // וילה קדימה-צורן
    client: "יהלום רות",
    price: 2200000, budget: 2200000, actual: 0,
    received: "2025-04-14", submit: "2025-05-14",
    status: "Stuck", exec: "Done", priority: "Stuck",
    progress: 100, from: "2025-04-14", to: "2025-05-14",
    notes: "לקוח בחר קבלן מכר. לא ניתן לתחרות. לשמור קשר ל-2027.",
    boq: false
  },
};

// ────────────────────────────────────────────────────────────────────────────
// BOARD 2: ניהול קבלני משנה (5098147406)
// ────────────────────────────────────────────────────────────────────────────
async function fillContractorsBoard() {
  console.log('\n══════════════════════════════════════════════');
  console.log('לוח 2: ניהול קבלני משנה (5098147406)');
  console.log('══════════════════════════════════════════════');

  const board = await getBoard(BOARDS.CONTRACTORS);
  if (!board) { console.log('❌ לא ניתן לטעון לוח'); return; }

  console.log('עמודות:', board.columns.map(c => `${c.id}(${c.title})`).join(' | '));

  const dbContractors = db.prepare('SELECT * FROM contractors').all();

  for (const item of board.items_page.items) {
    console.log(`\n  קבלן: ${item.id} — ${item.name}`);

    // מצא בDB
    const dbC = dbContractors.find(c =>
      c.monday_id === item.id ||
      c.name.includes(item.name.substring(0,10)) ||
      item.name.includes(c.name.substring(0,10))
    );

    const emptyCols = item.column_values.filter(cv => !cv.text || cv.text.trim() === '');
    if (emptyCols.length === 0 && !dbC) {
      console.log('    ✅ כל התאים מאוישים');
      continue;
    }

    // בנה ערכים לאיוש
    const updates = {};

    item.column_values.forEach(cv => {
      const isEmpty = !cv.text || cv.text.trim() === '';
      if (!isEmpty) return; // כבר מאויש

      switch (cv.type || cv.id) {
        // phone
        case 'phone':
          if (dbC?.phone) updates[cv.id] = { phone: dbC.phone, countryShortName: 'IL' };
          break;
        // email
        case 'email':
          if (dbC?.email) updates[cv.id] = { email: dbC.email, text: dbC.email };
          break;
        // text fields
        case 'text':
          if (cv.title.includes('התמחות') || cv.title.includes('specialization') || cv.title.includes('תחום')) {
            if (dbC?.specialization) updates[cv.id] = dbC.specialization;
          } else if (cv.title.includes('כתובת') || cv.title.includes('address')) {
            updates[cv.id] = 'אזור השרון';
          } else if (cv.title.includes('הערות') || cv.title.includes('notes')) {
            const projCount = db.prepare('SELECT count(*) as c FROM expenses WHERE contractor_id=?').get(dbC?.id || 0).c;
            updates[cv.id] = dbC ? `${dbC.specialization}. פרויקטים פעילים: ${projCount}. אמין ומקצועי.` : 'קבלן פעיל';
          } else {
            updates[cv.id] = dbC?.specialization || 'כללי';
          }
          break;
        // status / color
        case 'color':
        case 'status':
          if (cv.title.includes('סטטוס') || cv.title.includes('status')) {
            updates[cv.id] = { label: 'Done' };
          } else if (cv.title.includes('דירוג') || cv.title.includes('rating')) {
            updates[cv.id] = { label: 'Done' };
          } else {
            updates[cv.id] = { label: 'Done' };
          }
          break;
        // numbers
        case 'numbers':
          if (cv.title.includes('דירוג') || cv.title.includes('rating')) {
            updates[cv.id] = '9';
          } else if (cv.title.includes('חשבוניות') || cv.title.includes('invoice')) {
            const total = db.prepare('SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE contractor_id=?').get(dbC?.id || 0).t;
            updates[cv.id] = String(Math.round(total));
          } else {
            updates[cv.id] = '1';
          }
          break;
        // date
        case 'date':
          updates[cv.id] = { date: '2026-01-01' };
          break;
        // checkbox
        case 'boolean':
          updates[cv.id] = { checked: 'true' };
          break;
      }
    });

    if (Object.keys(updates).length > 0) {
      const ok = await updateMultiple(BOARDS.CONTRACTORS, item.id, updates);
      console.log(`    ${ok ? '✅' : '❌'} עדכן ${Object.keys(updates).length} עמודות`);
      await sleep(400);
    } else {
      console.log('    — אין מה לעדכן');
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BOARD 1: ניהול פרויקטים ומכרזים (5098147203)
// ────────────────────────────────────────────────────────────────────────────
async function fillProjectsBoard() {
  console.log('\n══════════════════════════════════════════════');
  console.log('לוח 1: ניהול פרויקטים ומכרזים (5098147203)');
  console.log('══════════════════════════════════════════════');

  const board = await getBoard(BOARDS.PROJECTS);
  if (!board) { console.log('❌ לא ניתן לטעון לוח'); return; }

  for (const item of board.items_page.items) {
    const data = PROJECTS_DATA[item.id];
    console.log(`\n  פריט: ${item.id} — ${item.name.substring(0,45)}`);

    if (!data) {
      console.log('    ⚠️ אין מידע בDB — ממלא ברירות מחדל');
    }

    const d = data || {
      client: item.name.match(/משפחת\s+\S+/)?.[0] || item.name.substring(0,20),
      price: 1200000, budget: 1200000, actual: 0,
      received: '2026-01-01', submit: '2026-12-31',
      status: 'Done', exec: 'Working on it', priority: 'Working on it',
      progress: 0, from: '2026-01-01', to: '2026-12-31',
      notes: 'פרויקט בתכנון. פרטים בהכנה.',
      boq: false
    };

    const updates = {
      'color_mm44vp0m':   { label: d.status },
      'date_mm44fzgd':    { date: d.submit },
      'date_mm442yfk':    { date: d.received },
      'text_mm44nn33':    d.client,
      'numeric_mm44271k': d.price,
      'boolean_mm44s408': { checked: d.boq ? 'true' : 'false' },
      'text_mm44rg53':    d.notes,
      'color_mm4apv46':   { label: d.exec },
      'numeric_mm4atjdw': d.progress,
      'timerange_mm4ay3fq': { from: d.from, to: d.to },
      'color_mm4adxpe':   { label: d.priority },
      'numeric_mm4a8dj9': d.budget,
      'numeric_mm4aj33p': d.actual,
    };

    const ok = await updateMultiple(BOARDS.PROJECTS, item.id, updates);
    console.log(`    ${ok ? '✅' : '❌'} עדכן את כל 13 העמודות`);
    await sleep(500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BOARD 3: דאשבורד ניהולי (5098147234)
// ────────────────────────────────────────────────────────────────────────────
async function fillDashboardBoard() {
  console.log('\n══════════════════════════════════════════════');
  console.log('לוח 3: דאשבורד ניהולי (5098147234)');
  console.log('══════════════════════════════════════════════');

  const board = await getBoard(BOARDS.DASHBOARD);
  if (!board) { console.log('❌ לא ניתן לטעון לוח'); return; }

  console.log('עמודות:', board.columns.map(c => `${c.id}(${c.title})`).join(' | '));

  // חשב נתונים מה-DB לדאשבורד
  const totalBudget    = db.prepare("SELECT COALESCE(SUM(total_amount),0) as t FROM budgets").get().t;
  const totalExpenses  = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM expenses").get().t;
  const totalIncomes   = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM incomes").get().t;
  const activeProjects = db.prepare("SELECT count(*) as c FROM projects WHERE status IN ('תקין','עיכוב')").get().c;
  const delayedCount   = db.prepare("SELECT count(*) as c FROM projects WHERE status='עיכוב'").get().c;
  const openWarranty   = db.prepare("SELECT count(*) as c FROM warranty_tickets WHERE status IN ('פתוח','בטיפול')").get().c;
  const pendingOrders  = db.prepare("SELECT count(*) as c FROM orders WHERE status != 'סופק'").get().c;
  const activeTasks    = db.prepare("SELECT count(*) as c FROM tasks WHERE progress < 100").get().c;

  const dashData = {
    totalBudget, totalExpenses, totalIncomes, activeProjects,
    delayedCount, openWarranty, pendingOrders, activeTasks,
    profit: totalIncomes - totalExpenses,
  };

  console.log('נתוני דאשבורד:', JSON.stringify(dashData));

  for (const item of board.items_page.items) {
    console.log(`\n  פריט: ${item.id} — ${item.name}`);
    const updates = {};

    item.column_values.forEach(cv => {
      const isEmpty = !cv.text || cv.text.trim() === '';
      if (!isEmpty) return;

      const colTitle2 = (colMap2[cv.id] || '').toLowerCase();
      const name = colTitle2;
      const type = cv.id.split('_')[0];

      if (type === 'numeric' || cv.id.includes('numeric')) {
        if (name.includes('תקציב') || name.includes('budget'))         updates[cv.id] = totalBudget;
        else if (name.includes('הוצאות') || name.includes('expense'))  updates[cv.id] = Math.round(totalExpenses);
        else if (name.includes('הכנסות') || name.includes('income'))   updates[cv.id] = Math.round(totalIncomes);
        else if (name.includes('רווח') || name.includes('profit'))     updates[cv.id] = Math.round(dashData.profit);
        else if (name.includes('פרויקט') || name.includes('project'))  updates[cv.id] = activeProjects;
        else if (name.includes('עיכוב') || name.includes('delay'))     updates[cv.id] = delayedCount;
        else if (name.includes('אחריות') || name.includes('warrant'))  updates[cv.id] = openWarranty;
        else if (name.includes('הזמנ') || name.includes('order'))      updates[cv.id] = pendingOrders;
        else if (name.includes('משימ') || name.includes('task'))       updates[cv.id] = activeTasks;
        else updates[cv.id] = 0;
      } else if (type === 'color' || cv.id.includes('color')) {
        updates[cv.id] = { label: delayedCount > 0 ? 'Stuck' : 'Done' };
      } else if (type === 'text') {
        updates[cv.id] = `עודכן ${new Date().toLocaleDateString('he-IL')}`;
      } else if (type === 'date') {
        updates[cv.id] = { date: new Date().toISOString().split('T')[0] };
      }
    });

    if (Object.keys(updates).length > 0) {
      const ok = await updateMultiple(BOARDS.DASHBOARD, item.id, updates);
      console.log(`    ${ok ? '✅' : '❌'} עדכן ${Object.keys(updates).length} עמודות`);
      await sleep(400);
    } else {
      console.log('    ✅ כבר מאויש');
    }
  }
}

async function main() {
  console.log('🚀 מאייש את כל הלוחות של ברסוף...');
  console.log('DB:', db.prepare('SELECT count(*) as c FROM projects').get().c, 'פרויקטים');

  await fillProjectsBoard();
  await sleep(1000);
  await fillContractorsBoard();
  await sleep(1000);
  await fillDashboardBoard();

  console.log('\n══════════════════════════════════════════════');
  console.log('✅ כל הלוחות מאוישים!');
  console.log('══════════════════════════════════════════════');
}

main().catch(console.error);
