import db from './db.js';

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE";

async function mondayApi(query) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  if (data.errors) {
    console.error('Monday API Error in CRON:', data.errors);
    return null;
  }
  return data.data;
}

export function initCronJobs() {
  console.log('🕒 Initializing Barsuf Automation Cron Jobs...');
  
  // Run every hour
  setInterval(() => {
    checkSubcontractorsReminders();
    checkProjectDeadlines();
  }, 1000 * 60 * 60);

  // Run once immediately on boot after a slight delay
  setTimeout(() => {
    checkSubcontractorsReminders();
    checkProjectDeadlines();
  }, 5000);
}

// 4. תזכורת לקבלני משנה (אם לאחר 3 ימים סטטוס קבלן ממתין)
async function checkSubcontractorsReminders() {
  try {
    const data = await mondayApi(`{
      boards(ids: [5098147406]) {
        items_page(limit: 100) {
          items {
            id name
            column_values { id title type text value }
          }
        }
      }
    }`);

    if (!data?.boards?.[0]) return;
    
    const items = data.boards[0].items_page.items;
    const now = new Date();

    for (const item of items) {
      let status = '';
      let sendDate = null;
      let email = '';

      item.column_values.forEach(cv => {
        const titleHe = (cv.title || '').toLowerCase();
        if (cv.type === 'status' && titleHe.includes('שליחה')) {
          status = cv.text;
        }
        if (cv.type === 'date' && titleHe.includes('שליחה')) {
          const val = JSON.parse(cv.value || '{}');
          if (val && val.date) sendDate = new Date(val.date);
        }
      });

      if (status === 'Working on it' && sendDate) { // Working on it = ממתין
        const diffTime = Math.abs(now - sendDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 3) {
          // בדוק אם כבר התרענו
          const existing = db.prepare('SELECT id FROM alerts WHERE type=? AND message LIKE ?').get('contractor_reminder', `%${item.id}%`);
          if (!existing) {
            console.log(`[CRON] Sending AUTOMATIC REMINDER EMAIL to contractor: ${item.name} (Waiting ${diffDays} days)`);
            db.prepare('INSERT INTO alerts (type, title, message) VALUES (?, ?, ?)')
              .run('contractor_reminder', 'נשלחה תזכורת אוטומטית לקבלן', `קבלן המשנה "${item.name}" מתעכב מעל 3 ימים. נשלח מייל תזכורת אוטומטי. [Ref: ${item.id}]`);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error in checkSubcontractorsReminders:', e);
  }
}

// 5. התראת תאריך יעד למנהל פרויקט (48 שעות לפני)
async function checkProjectDeadlines() {
  try {
    const data = await mondayApi(`{
      boards(ids: [5098147203]) {
        items_page(limit: 100) {
          items {
            id name
            group { id }
            column_values { id title type text value }
          }
        }
      }
    }`);

    if (!data?.boards?.[0]) return;
    
    const items = data.boards[0].items_page.items;
    const now = new Date();

    for (const item of items) {
      // לדלג על פרויקטים שזכינו או לא זכינו
      if (item.group?.id === 'group_mm44z5z9' || item.group?.id === 'group_mm4428r5') continue;

      let dueDate = null;

      item.column_values.forEach(cv => {
        const titleHe = (cv.title || '').toLowerCase();
        if (cv.type === 'date' && (titleHe.includes('יעד') || titleHe.includes('הגשה'))) {
          const val = JSON.parse(cv.value || '{}');
          if (val && val.date) dueDate = new Date(val.date);
        }
      });

      if (dueDate) {
        const diffTime = dueDate.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 60 * 60);
        
        // בין 0 ל-48 שעות
        if (diffHours > 0 && diffHours <= 48) {
          // בדוק אם כבר התרענו
          const existing = db.prepare('SELECT id FROM alerts WHERE type=? AND message LIKE ?').get('deadline_warning', `%${item.id}%`);
          if (!existing) {
            console.log(`[CRON] DEADLINE ALERT for project: ${item.name} (${Math.round(diffHours)} hours left)`);
            db.prepare('INSERT INTO alerts (type, title, message) VALUES (?, ?, ?)')
              .run('deadline_warning', 'התראת 48 שעות להגשה!', `נותרו פחות מ-48 שעות להגשת המכרז: "${item.name}". התראה נשלחה למנהל הפרויקט. [Ref: ${item.id}]`);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error in checkProjectDeadlines:', e);
  }
}
