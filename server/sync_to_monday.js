/**
 * sync_to_monday.js
 * מסנכרן את כל הפרויקטים מהאפליקציה ל-Monday.com
 * מעדכן פריטים קיימים לפי monday_id או יוצר חדשים
 */

import db from './db.js';

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE";
const BOARD_ID = "5098147203";

// Column IDs מהלוח (מוודא עם API)
const COL = {
  status:       "color_mm44vp0m",   // סטטוס (Won/Stuck/Done)
  submitDate:   "date_mm44fzgd",    // יעד הגשה
  receivedDate: "date_mm442yfk",    // תאריך קבלת פנייה
  clientName:   "text_mm44nn33",    // שם לקוח
  price:        "numeric_mm44271k", // סכום הצעה (₪)
  boqDone:      "boolean_mm44s408", // כתב כמויות
  notes:        "text_mm44rg53",    // הערות
  execStatus:   "color_mm4apv46",   // סטטוס ביצוע
  progress:     "numeric_mm4atjdw", // התקדמות %
  timeline:     "timerange_mm4ay3fq", // לוח זמנים
  priority:     "color_mm4adxpe",   // עדיפות
  budget:       "numeric_mm4a8dj9", // תקציב מתוכנן
  actual:       "numeric_mm4aj33p", // עלות בפועל
};

// מיפוי סטטוס אפליקציה -> Monday label
const STATUS_MAP = {
  "תקין":   { [COL.status]: { label: "Done"  }, [COL.priority]: { label: "Working on it" } },
  "עיכוב":  { [COL.status]: { label: "Stuck" }, [COL.priority]: { label: "High"           } },
  "הושלם":  { [COL.status]: { label: "Done"  }, [COL.priority]: { label: "Done"            } },
};

async function mondayApi(query, variables = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

async function getOrCreateItem(projectName, mondayId) {
  // בדוק אם יש כבר פריט בלוח
  if (mondayId && mondayId.length > 5) {
    const data = await mondayApi(`{ items(ids: [${mondayId}]) { id name } }`);
    if (data.items && data.items.length > 0) return data.items[0].id;
  }
  // צור פריט חדש
  const data = await mondayApi(
    `mutation($boardId: ID!, $name: String!) {
       create_item(board_id: $boardId, item_name: $name) { id }
     }`,
    { boardId: BOARD_ID, name: projectName }
  );
  return data.create_item.id;
}

async function updateItemColumns(itemId, columnValues) {
  const colValStr = JSON.stringify(JSON.stringify(columnValues));
  await mondayApi(
    `mutation($boardId: ID!, $itemId: ID!, $cols: JSON!) {
       change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $cols) { id }
     }`,
    { boardId: BOARD_ID, itemId: String(itemId), cols: JSON.stringify(columnValues) }
  );
}

async function syncProject(project) {
  console.log(`\n📤 מסנכרן: ${project.name}`);

  // חשב נתוני תקציב והוצאות מהDB
  const budgetTotal = db.prepare("SELECT COALESCE(SUM(total_amount),0) as t FROM budgets WHERE project_id=?").get(project.id).t;
  const actualTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE project_id=?").get(project.id).t;
  const incomeTotal = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM incomes WHERE project_id=?").get(project.id).t;

  // מצא את טווח התאריכים מהמשימות
  const taskRange = db.prepare("SELECT MIN(start_date) as s, MAX(end_date) as e FROM tasks WHERE project_id=?").get(project.id);
  const progress  = db.prepare("SELECT COALESCE(AVG(progress),0) as p FROM tasks WHERE project_id=?").get(project.id).p;

  // הערות מורחבות
  const lastLog = db.prepare("SELECT notes, date FROM daily_logs WHERE project_id=? ORDER BY date DESC LIMIT 1").get(project.id);
  const openWarranty = db.prepare("SELECT count(*) as c FROM warranty_tickets WHERE project_id=? AND (status='פתוח' OR status='בטיפול')").get(project.id).c;
  const pendingOrders = db.prepare("SELECT count(*) as c FROM orders WHERE project_id=? AND status != 'סופק'").get(project.id).c;

  let notesText = project.analysis ? project.analysis.substring(0, 180).replace(/\n/g,' ') : '';
  if (lastLog) notesText += ` | יומן ${lastLog.date}: ${lastLog.notes.substring(0,80)}`;
  if (openWarranty > 0) notesText += ` | ${openWarranty} קריאות אחריות פתוחות`;
  if (pendingOrders > 0) notesText += ` | ${pendingOrders} הזמנות ממתינות`;

  // קבע סטטוס ביצוע
  const prog = Math.round(progress);
  let execLabel = "Not Started";
  if (prog > 0 && prog < 100) execLabel = "Working on it";
  if (prog === 100) execLabel = "Done";
  if (project.status === "עיכוב") execLabel = "Stuck";

  // מצא / צור פריט
  let itemId;
  try {
    itemId = await getOrCreateItem(project.name, project.monday_id);
  } catch(e) {
    console.error('  ❌ שגיאה ביצירת פריט:', e.message);
    return;
  }

  // עדכן עמודות
  const colValues = {
    [COL.clientName]:   project.name.match(/משפחת\s+\S+/) ? project.name.match(/משפחת\s+\S+/)[0] : project.name,
    [COL.price]:        project.proposal ? parseInt(project.proposal.match(/[\d,]+/)?.[0]?.replace(/,/g,'') || 0) : 0,
    [COL.boqDone]:      { checked: "true" },
    [COL.notes]:        notesText.substring(0, 500),
    [COL.execStatus]:   { label: execLabel },
    [COL.progress]:     prog,
    [COL.budget]:       budgetTotal,
    [COL.actual]:       Math.round(actualTotal),
    [COL.status]:       project.status === "עיכוב" ? { label: "Stuck" } : { label: "Done" },
    [COL.priority]:     project.status === "עיכוב" ? { label: "Stuck" } : { label: "Working on it" },
  };

  if (project.end_date) colValues[COL.submitDate] = { date: project.end_date };

  if (taskRange && taskRange.s && taskRange.e) {
    colValues[COL.timeline] = { from: taskRange.s, to: taskRange.e };
  }

  try {
    await updateItemColumns(itemId, colValues);
    // שמור monday_id בDB אם חדש
    if (project.monday_id !== String(itemId)) {
      db.prepare("UPDATE projects SET monday_id=? WHERE id=?").run(String(itemId), project.id);
    }
    console.log(`  ✅ מסונכרן בהצלחה | ID: ${itemId} | התקדמות: ${prog}% | תקציב: ${budgetTotal.toLocaleString()} ₪ | ממשי: ${actualTotal.toLocaleString()} ₪`);
  } catch(e) {
    console.error('  ❌ שגיאת עדכון עמודות:', e.message);
  }
}

async function syncContractors() {
  const CONT_BOARD = "5098147406";
  const contractors = db.prepare("SELECT * FROM contractors").all();
  console.log(`\n👷 מסנכרן ${contractors.length} קבלנים ל-Monday...`);

  for (const c of contractors) {
    try {
      // בדוק אם קיים
      let itemId = c.monday_id;
      if (itemId) {
        const data = await mondayApi(`{ items(ids: [${itemId}]) { id } }`);
        if (!data.items || data.items.length === 0) itemId = null;
      }
      if (!itemId) {
        const data = await mondayApi(
          `mutation($boardId: ID!, $name: String!) { create_item(board_id: $boardId, item_name: $name) { id } }`,
          { boardId: CONT_BOARD, name: c.name }
        );
        itemId = data.create_item.id;
        db.prepare("UPDATE contractors SET monday_id=? WHERE id=?").run(String(itemId), c.id);
      }
      console.log(`  ✅ ${c.name} | ID: ${itemId}`);
    } catch(e) {
      console.error(`  ❌ ${c.name}:`, e.message);
    }
  }
}

async function main() {
  console.log('🚀 התחלת סנכרון מלא: אפליקציה → Monday.com');
  console.log('='.repeat(60));

  const projects = db.prepare("SELECT * FROM projects").all();
  console.log(`📋 נמצאו ${projects.length} פרויקטים`);

  for (const project of projects) {
    await syncProject(project);
    await new Promise(r => setTimeout(r, 500)); // throttle
  }

  await syncContractors();

  // סיכום
  const summary = {
    projects:    db.prepare("SELECT count(*) as c FROM projects").get().c,
    tasks:       db.prepare("SELECT count(*) as c FROM tasks").get().c,
    expenses:    db.prepare("SELECT count(*) as c FROM expenses").get().c,
    incomes:     db.prepare("SELECT count(*) as c FROM incomes").get().c,
    logs:        db.prepare("SELECT count(*) as c FROM daily_logs").get().c,
    orders:      db.prepare("SELECT count(*) as c FROM orders").get().c,
    warranty:    db.prepare("SELECT count(*) as c FROM warranty_tickets").get().c,
    contractors: db.prepare("SELECT count(*) as c FROM contractors").get().c,
  };

  console.log('\n' + '='.repeat(60));
  console.log('✅ סנכרון הושלם!');
  console.log(`   פרויקטים: ${summary.projects} | משימות: ${summary.tasks} | הוצאות: ${summary.expenses}`);
  console.log(`   הכנסות: ${summary.incomes} | יומנים: ${summary.logs} | הזמנות: ${summary.orders}`);
  console.log(`   אחריות: ${summary.warranty} | קבלנים: ${summary.contractors}`);
}

main().catch(console.error);
