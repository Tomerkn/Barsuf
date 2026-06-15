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

function getRandomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

function getLogicDates(baseDate, durationDays) {
  const start = new Date(baseDate);
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return {
    recv: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

async function fillDashboardBoard() {
  console.log('\\n══ לוח 3: דאשבורד ניהולי ══');
  const board = await getBoard(BOARDS.DASHBOARD);
  if (!board) return;

  const colMap = {};
  board.columns.forEach(c => { colMap[c.id] = { title: c.title, type: c.type }; });

  for (const item of board.items_page.items) {
    const updates = {};
    const itemName = item.name || '';

    // Smart values based on item name
    let currentVal = 0;
    let targetVal = 0;
    let trend = 'Done'; // "Done" or positive/negative label mapping to green/red
    let expl = 'מצב תקין ומגמת שיפור';

    if (itemName.includes('אחוז זכייה')) {
      currentVal = 35; targetVal = 40; trend = 'Stuck'; expl = 'ירידה קלה החודש, נדרש שיפור בתמחור שלד';
    } else if (itemName.includes('הצעות פתוחות')) {
      currentVal = 12; targetVal = 15; trend = 'Working on it'; expl = 'כמות הצעות טובה לקראת רבעון הבא';
    } else if (itemName.includes('ממוצע ימי הכנת הצעה')) {
      currentVal = 8; targetVal = 5; trend = 'Stuck'; expl = 'חריגה מהיעד עקב עומס במחלקת תמחור';
    } else if (itemName.includes('היקף הצעות')) {
      currentVal = 45; targetVal = 50; trend = 'Done'; expl = 'עמידה ביעד בזכות כניסת פרויקטי יוקרה';
    } else if (itemName.includes('קבלנים שלא הגיבו')) {
      currentVal = 4; targetVal = 0; trend = 'Working on it'; expl = 'מעקב טלפוני שבועי נדרש';
    } else if (itemName.includes('חיסכון כספי משוער')) {
      currentVal = 120000; targetVal = 150000; trend = 'Done'; expl = 'מו"מ מוצלח עם ספקי בטון';
    } else if (itemName.includes('פנייה חדשה - התראה מיידית')) {
      currentVal = 2; targetVal = 0; trend = 'Stuck'; expl = '2 פניות טרם טופלו היום';
    } else if (itemName.includes('3 ימים ללא מענה')) {
      currentVal = 1; targetVal = 0; trend = 'Working on it'; expl = 'קבלן חשמל לא הגיב למכרז פיתוח';
    } else if (itemName.includes('48 שעות לפני יעד')) {
      currentVal = 3; targetVal = 0; trend = 'Done'; expl = 'כל ההצעות הוגשו בזמן למעט אחת';
    } else if (itemName.includes('זכייה - פתיחת פרויקט')) {
      currentVal = 1; targetVal = 2; trend = 'Working on it'; expl = 'פרויקט חדש הוקם החודש';
    } else {
      currentVal = Math.floor(Math.random() * 100);
      targetVal = 100;
      trend = currentVal > 50 ? 'Done' : 'Stuck';
      expl = 'נתונים התעדכנו אוטומטית';
    }

    item.column_values.forEach(cv => {
      const col = colMap[cv.id] || {};
      const titleHe = (col.title || '').toLowerCase();
      const type = cv.type;

      switch (type) {
        case 'numbers':
          if (titleHe.includes('נוכחי')) updates[cv.id] = currentVal;
          else if (titleHe.includes('יעד')) updates[cv.id] = targetVal;
          break;
        case 'color':
        case 'status':
          updates[cv.id] = { label: trend };
          break;
        case 'text':
          if (titleHe.includes('מדד')) updates[cv.id] = itemName;
          else if (titleHe.includes('הסבר') || titleHe.includes('הערות')) updates[cv.id] = expl;
          break;
      }
    });

    const ok = await updateAll(BOARDS.DASHBOARD, item.id, updates);
    console.log("  " + (ok ? "✅" : "❌") + " " + item.name + " — עודכן");
    await sleep(400);
  }
}

async function fillProjectsBoard() {
  console.log('\\n══ לוח 1: ניהול פרויקטים ומכרזים ══');
  const board = await getBoard(BOARDS.PROJECTS);
  if (!board) return;

  const colMap = {};
  board.columns.forEach(c => { colMap[c.id] = { title: c.title, type: c.type }; });

  for (const item of board.items_page.items) {
    const updates = {};
    const isNew = item.name.includes('מכרז') || item.name.includes('חדש');
    
    // Gen logical dates
    const baseRecv = getRandomDate(2025, 2026);
    const dLogic = getLogicDates(baseRecv, isNew ? 60 : 365); // tenders take 60 days, projects 365
    
    item.column_values.forEach(cv => {
      const col = colMap[cv.id] || {};
      const titleHe = (col.title || '').toLowerCase();
      
      if (cv.type === 'date') {
        if (titleHe.includes('הגשה') || titleHe.includes('סיום') || titleHe.includes('יעד')) {
          updates[cv.id] = { date: dLogic.end };
        } else if (titleHe.includes('פנייה') || titleHe.includes('התחלה') || titleHe.includes('תאריך')) {
          updates[cv.id] = { date: dLogic.recv };
        }
      } else if (cv.type === 'checkbox' && !cv.text) {
        updates[cv.id] = { checked: 'true' };
      } else if (cv.type === 'text' && !cv.text && titleHe.includes('לקוח')) {
        updates[cv.id] = item.name.split('—')[0].trim();
      } else if (cv.type === 'numbers' && !cv.text) {
        updates[cv.id] = Math.floor(Math.random() * 2000000) + 500000;
      } else if (cv.type === 'timeline') {
        updates[cv.id] = { from: dLogic.recv, to: dLogic.end };
      } else if (cv.type === 'status' && !cv.text) {
         updates[cv.id] = { label: "Working on it" };
      }
    });

    if (Object.keys(updates).length > 0) {
      const ok = await updateAll(BOARDS.PROJECTS, item.id, updates);
      console.log("  " + (ok ? "✅" : "❌") + " " + item.name + " — עודכנו תאריכים ושדות ריקים");
      await sleep(400);
    }
  }
}

async function fillContractorsBoard() {
  console.log('\\n══ לוח 2: ניהול קבלני משנה ══');
  const board = await getBoard(BOARDS.CONTRACTORS);
  if (!board) return;

  const colMap = {};
  board.columns.forEach(c => { colMap[c.id] = { title: c.title, type: c.type }; });

  for (const item of board.items_page.items) {
    const updates = {};
    
    // Gen logical dates
    const dLogic = getLogicDates(getRandomDate(2025, 2026), Math.floor(Math.random() * 60) + 10);
    
    item.column_values.forEach(cv => {
      const col = colMap[cv.id] || {};
      const titleHe = (col.title || '').toLowerCase();
      
      if (cv.type === 'date') {
        updates[cv.id] = { date: dLogic.recv }; // logical scattered dates
      } else if (!cv.text && cv.type === 'checkbox') {
        updates[cv.id] = { checked: 'true' };
      } else if (!cv.text && cv.type === 'text') {
        if (titleHe.includes('הערות')) updates[cv.id] = 'עבודה מקצועית ואמינה.';
        else if (titleHe.includes('תחום')) updates[cv.id] = 'בנייה כללית';
      }
    });

    if (Object.keys(updates).length > 0) {
      const ok = await updateAll(BOARDS.CONTRACTORS, item.id, updates);
      console.log("  " + (ok ? "✅" : "❌") + " " + item.name + " — עודכנו תאריכים");
      await sleep(400);
    }
  }
}

async function main() {
  console.log('מתקן ומאייש תאריכים ודאשבורד עם הגיון עמוק...');
  await fillDashboardBoard();
  await fillProjectsBoard();
  await fillContractorsBoard();
  console.log('\\nהכל עודכן.');
}

main().catch(console.error);
