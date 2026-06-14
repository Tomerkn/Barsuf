const API_BASE_URL = '/api'; // משתמשים בנתיב יחסי, ה-Vite Proxy יפנה את זה לפורט 3001 בפיתוח

export const api = { // יצירת השליח שמדבר עם השרת
  baseUrl: API_BASE_URL, // הכתובת הבסיסית של השרת
  getProjects: async () => { // בקשה לקבלת כל הפרויקטים
    try {
      const response = await fetch(`${API_BASE_URL}/projects?t=${Date.now()}`); // מבקשים מהשרת את הרשימה ומבטלים מטמון
      if (!response.ok) return []; // אם יש תקלה, מחזירים מערך ריק כדי שלא יקרוס
      const data = await response.json();
      return Array.isArray(data) ? data : []; // מוודאים שזה באמת מערך
    } catch (error) {
      console.error('Fetch projects failed:', error);
      return []; // במקרה של שגיאת רשת, מחזירים מערך ריק
    }
  },
  createProject: async (data) => { // בקשה ליצירת פרויקט חדש
    const response = await fetch(`${API_BASE_URL}/projects`, { // שולחים את פרטי הפרויקט לשרת
      method: 'POST', // פעולה של הוספה
      headers: { 'Content-Type': 'application/json' }, // אומרים לשרת שזה מידע מסוג JSON
      body: JSON.stringify(data), // הופכים את המידע לטקסט שהשרת מבין
    });
    if (!response.ok) throw new Error('Failed to create project'); // אם נכשל
    return response.json(); // מחזירים את הפרויקט שנוצר
  },
  getProjectAnalytics: async (projectId) => { // בקשה לקבלת הנתונים הכספיים של פרויקט
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/analytics`); // מבקשים מהשרת ניתוח של פרויקט ספציפי
    if (!response.ok) throw new Error('Failed to fetch analytics'); // אם נכשל
    return response.json(); // מחזירים את הנתונים והגרפים
  },
  getExpenses: async (projectId = '') => { // בקשה לקבלת כל ההוצאות
    const url = projectId ? `${API_BASE_URL}/expenses?projectId=${projectId}` : `${API_BASE_URL}/expenses`; // בונים את הכתובת לפי הפרויקט
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch expenses'); // אם נכשל
    return response.json(); // מחזירים רשימת הוצאות
  },
  getIncomes: async (projectId = '') => { // בקשה לקבלת כל ההכנסות
    const url = projectId ? `${API_BASE_URL}/incomes?projectId=${projectId}` : `${API_BASE_URL}/incomes`; // בונים את הכתובת
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch incomes'); // אם נכשל
    return response.json(); // מחזירים רשימת הכנסות
  },
  createIncome: async (data) => { // תיעוד הכנסה חדשה
    const response = await fetch(`${API_BASE_URL}/incomes`, { // שולחים פרטים לשרת
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create income'); // אם נכשל
    return response.json(); // מחזירים את ההכנסה שנוצרה
  },
  getContractors: async () => { // קבלת רשימת קבלנים
    const response = await fetch(`${API_BASE_URL}/contractors`); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch contractors'); // אם נכשל
    return response.json(); // מחזירים את הקבלנים
  },
  createContractor: async (data) => { // הוספת קבלן חדש
    const response = await fetch(`${API_BASE_URL}/contractors`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create contractor'); // אם נכשל
    return response.json(); // מחזירים את הקבלן החדש
  },
  getOrders: async () => { // קבלת כל ההזמנות
    const response = await fetch(`${API_BASE_URL}/orders`); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch orders'); // אם נכשל
    return response.json(); // מחזירים רשימת הזמנות
  },
  createOrder: async (data) => { // יצירת הזמנה חדשה
    const response = await fetch(`${API_BASE_URL}/orders`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create order'); // אם נכשל
    return response.json(); // מחזירים את ההזמנה שנוצרה
  },
  getBudgets: async (projectId) => { // קבלת סעיפי התקציב
    const url = projectId ? `${API_BASE_URL}/budgets?projectId=${projectId}` : `${API_BASE_URL}/budgets`; // בונים כתובת
    const response = await fetch(url); // מבקשים מהשרת
    if (!response.ok) throw new Error('Failed to fetch budgets'); // אם נכשל
    return response.json(); // מחזירים רשימת תקציבים
  },
  createBudget: async (data) => { // הוספת סעיף תקציב
    const response = await fetch(`${API_BASE_URL}/budgets`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create budget'); // אם נכשל
    return response.json(); // מחזירים את התקציב החדש
  },
  createExpense: async (data) => { // הוספת הוצאה כספית
    const response = await fetch(`${API_BASE_URL}/expenses`, { // שולחים פרטים
      method: 'POST', // הוספה
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error('Failed to create expense'); // אם נכשל
    return response.json(); // מחזירים את ההוצאה שנוצרה
  },
  updateResource: async (resourceType, id, data) => { // עדכון מידע קיים (תקציב, הוצאה וכו')
    const response = await fetch(`${API_BASE_URL}/${resourceType}/${id}`, { // שולחים עדכון לכתובת המתאימה
      method: 'PUT', // פעולה של עדכון
      headers: { 'Content-Type': 'application/json' }, // סוג מידע
      body: JSON.stringify(data), // המרת המידע
    });
    if (!response.ok) throw new Error(`Failed to update ${resourceType}`); // אם נכשל
    return response.json(); // מחזירים אישור הצלחה
  },
  deleteResource: async (resourceType, id) => { // מחיקת מידע מהמערכת
    const response = await fetch(`${API_BASE_URL}/${resourceType}/${id}`, { // מבקשים מחיקה מהכתובת המתאימה
      method: 'DELETE' // פעולה של מחיקה
    });
    if (!response.ok) throw new Error(`Failed to delete ${resourceType}`); // אם נכשל
    return response.json(); // מחזירים אישור הצלחה
  },
  
  // --- בינה מלאכותית ומכרזים ---
  analyzeTender: async (tenderId) => { // ניתוח מכרז חכם
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/analyze`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('נכשל בניתוח המכרז');
    return response.json();
  },
  resetTenderProposal: async (tenderId) => { // איפוס הצעת מחיר
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/reset-proposal`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('נכשל באיפוס הצעת המחיר');
    return response.json();
  },
  reseed: async () => { // שחזור נתוני דמו
    const response = await fetch(`${API_BASE_URL}/reseed`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('נכשל בשחזור נתוני דמו');
    return response.json();
  },
  uploadGlobalKnowledge: async (file) => { // העלאת ידע ארגוני
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/global-knowledge`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('נכשל בהעלאת ידע ארגוני');
    return response.json();
  },
  
  // --- ניהול מכרזים מלא ---
  getTenders: async () => {
    const response = await fetch(`${API_BASE_URL}/tenders?t=${Date.now()}`);
    if (!response.ok) throw new Error('נכשל בטעינת מכרזים');
    return response.json();
  },
  createTender: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/tenders`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed details:', errorText);
      throw new Error(`נכשל בהעלאת מכרז: ${errorText}`);
    }
    return response.json();
  },
  generateTenderProposal: async (tenderId) => {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/proposal`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('נכשל בהפקת הצעת מחיר');
    return response.json();
  },
  convertTenderToProject: async (tenderId) => {
    const response = await fetch(`${API_BASE_URL}/tenders/${tenderId}/convert-to-project`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('נכשל בהעברת המכרז לפרויקטים');
    return response.json();
  },
  // העלאת קובץ לפרויקט (מסמכים, תמונות)
  uploadProjectFile: async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('נכשל בהעלאת הקובץ');
    return response.json();
  },
  // קבלת כל קבצי הפרויקט
  getProjectFiles: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/media`);
    if (!response.ok) throw new Error('נכשל בטעינת קבצי הפרויקט');
    return response.json();
  },
  
  // קבלת משימות לוח זמנים (Gantt) של פרויקט
  getProjectTasks: async (projectId) => { // פונקציה לקבלת כל המשימות
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`); // פנייה לשרת לקבלת המשימות של הפרויקט
    if (!response.ok) throw new Error('נכשל בטעינת משימות הפרויקט'); // בדיקה אם הקריאה נכשלה
    return response.json(); // החזרת המשימות בפורמט JSON
  }, // סיום פונקציית קבלת משימות
  
  // ביצוע סנכרון משימות ישירות מול Monday.com
  syncMonday: async (projectId, token, boardId) => { // פונקציה המפעילה את סנכרון השרת מול ה-API של מאנדיי
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/sync-monday`, { // פנייה לשרת לשליחת בקשת הסנכרון
      method: 'POST', // שליחה בשיטת POST
      headers: { 'Content-Type': 'application/json' }, // הגדרת סוג המידע כ-JSON
      body: JSON.stringify({ token, boardId }) // שליחת ה-Token וה-Board ID כחלק מגוף הבקשה
    }); // המתנה לתגובת השרת
    if (!response.ok) { // אם הקריאה נכשלה
      const err = await response.json(); // חילוץ הודעת השגיאה מהשרת
      throw new Error(err.error || 'נכשל בסנכרון מול Monday.com'); // זריקת שגיאה עם הסבר
    } // סיום תנאי השגיאה
    return response.json(); // החזרת אישור הצלחה מהשרת
  }, // סיום פונקציית הסנכרון
  
  // שמירת הגדרות החיבור ומצב הסנכרון האוטומטי של Monday בשרת
  saveMondayCredentials: async (projectId, token, boardId, autoSync) => { // פונקציה לשמירת פרטי החיבור במסד הנתונים של השרת
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/monday-credentials`, { // פנייה לשרת לשמירת הפרטים
      method: 'POST', // שיטת POST
      headers: { 'Content-Type': 'application/json' }, // סוג מידע JSON
      body: JSON.stringify({ token, boardId, autoSync }) // שליחת הנתונים בגוף הבקשה
    }); // המתנה
    if (!response.ok) throw new Error('נכשל בשמירת הגדרות מאנדיי בשרת'); // בדיקת תקינות
    return response.json(); // החזרת תשובת השרת
  }, // סיום פונקציית שמירת ההגדרות
  
  // ייצוא משימות ויצירת לוח פרויקט חדש אוטומטית ב-Monday.com
  exportProjectToMonday: async (projectId, token) => { // פונקציה המפעילה את תהליך הייצוא ויצירת הלוח בשרת
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/export-monday`, { // פנייה לנתיב הייצוא בשרת
      method: 'POST', // שיטת POST
      headers: { 'Content-Type': 'application/json' }, // סוג מידע JSON
      body: JSON.stringify({ token }) // שליחת ה-Token בגוף הבקשה
    }); // המתנה
    if (!response.ok) { // אם נכשל
      const err = await response.json(); // חילוץ השגיאה
      throw new Error(err.error || 'נכשל בייצוא הפרויקט ל-Monday.com'); // זריקת שגיאה
    } // סיום תנאי
    return response.json(); // החזרת פרטי הלוח החדש שנוצר
  }, // סיום פונקציית הייצוא והקמה
  
  // קבלת הגדרות סנכרון גלובליות של קבלנים מול Monday.com
  getMondayContractorsSettings: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/monday-contractors`);
    if (!response.ok) throw new Error('נכשל בטעינת הגדרות סנכרון קבלנים');
    return response.json();
  },
  
  // שמירת הגדרות סנכרון קבלנים גלובליות בשרת
  saveMondayContractorsSettings: async (token, boardId, autoSync) => {
    const response = await fetch(`${API_BASE_URL}/settings/monday-contractors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, boardId, autoSync })
    });
    if (!response.ok) throw new Error('נכשל בשמירת הגדרות סנכרון קבלנים');
    return response.json();
  },
  
  // ייצוא של כל הקבלנים ללוח ה-Monday.com
  exportContractorsToMonday: async () => {
    const response = await fetch(`${API_BASE_URL}/contractors/export-monday`, {
      method: 'POST'
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'נכשל בייצוא קבלנים ל-Monday.com');
    }
    return response.json();
  },
  
  // קבלת התראות מערכת כלליות בזמן אמת
  getSystemNotifications: async () => {
    const response = await fetch(`${API_BASE_URL}/notifications`);
    if (!response.ok) throw new Error('נכשל בטעינת התראות מערכת');
    return response.json();
  }
};
