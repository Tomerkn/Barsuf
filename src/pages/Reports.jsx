import React, { useEffect, useState } from 'react'; // ייבוא ריאקט והוקס של מחזור חיים ומצב
import { api } from '../services/api'; // ייבוא שירותי ה-API לתקשורת עם השרת
import { 
  Loader2, BarChart3, Download, FileText, Filter, Users, 
  Calendar, Layers, CheckCircle, AlertTriangle, TrendingUp, DollarSign
} from 'lucide-react'; // ייבוא אייקונים מעוצבים מספריית lucide-react
import { KpiCard } from '../components/ui/KpiCard'; // ייבוא רכיב כרטיס מדדי ביצוע (KPI)
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts'; // ייבוא רכיבי תרשימים מספריית Recharts ליצירת גרפים אינטראקטיביים

const formatCurrency = (value) => { // פונקציה לעיצוב מספרים כמטבע שקלים (ILS)
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value); // שימוש במעצב מובנה של דפדפן לפי תקן עברית ללא שברים
};

const COLORS = [ // מערך צבעים ייעודי לשימוש בגרפים ועוגות המותאם לעיצוב הממשק
  '#0d9488', // ירוק כהה / טורקיז (Teal)
  '#0284c7', // כחול שמיים (Sky)
  '#4f46e5', // אינדיגו (Indigo)
  '#7c3aed', // סגול (Violet)
  '#db2777', // ורוד (Pink)
  '#ea580c', // כתום (Orange)
  '#eab308', // צהוב (Yellow)
  '#10b981', // ברקת (Emerald)
  '#ef4444', // אדום (Red)
];

// תיבת עזר מותאמת אישית בעברית עבור ריחוף מעל הגרפים
const CustomTooltip = ({ active, payload, label }) => { // רכיב עזר להצגת נתוני נקודת הריחוף בגרף
  if (active && payload && payload.length) { // בודקים אם יש ריחוף פעיל וקיימים נתונים
    return ( // מחזירים תיבת מידע מעוצבת
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-md text-right text-xs" dir="rtl"> {/* תיבה מיושרת לימין */}
        <p className="font-bold text-slate-800 mb-1">{label}</p> {/* כותרת תיבת הריחוף */}
        {payload.map((p, idx) => ( // ריצה על רשימת הנתונים בנקודת הריחוף
          <p key={idx} className="font-semibold" style={{ color: p.color || p.fill }}> {/* הצגת הנתון עם צבע תואם */}
            {p.name}: {formatCurrency(p.value)} {/* שם המדד וערכו המפורמט כסכום */}
          </p> // סגירת שורת המדד
        ))}
      </div> // סגירת תיבת המידע
    ); // סיום ההחזרה
  } // סיום התנאי
  return null; // אם אין ריחוף פעיל, לא מציגים כלום
}; // סיום רכיב הריחוף

export function Reports() { // פונקציית הרכיב הראשי של דף הדוחות
  const [loading, setLoading] = useState(true); // מצב המציין האם הנתונים עדיין נטענים מהשרת
  
  // נתוני מקור מהשרת (לא מסוננים)
  const [projects, setProjects] = useState([]); // רשימת כל הפרויקטים הפעילים
  const [budgets, setBudgets] = useState([]); // רשימת כל סעיפי התקציב המתוכננים
  const [expenses, setExpenses] = useState([]); // רשימת כל ההוצאות שנרשמו במערכת
  const [contractors, setContractors] = useState([]); // רשימת כל הקבלנים והספקים
  
  // מצבי מסננים אינטראקטיביים
  const [selectedProject, setSelectedProject] = useState('all'); // מזהה הפרויקט המסונן כעת (או 'all' לכולם)
  const [selectedContractor, setSelectedContractor] = useState('all'); // מזהה הקבלן המסונן כעת (או 'all' לכולם)
  const [selectedCategory, setSelectedCategory] = useState('all'); // סוג סעיף תקציב מסונן (או 'all' לכולם)
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all'); // תדירות הזמן בגרפים ('all' חודשי, 'quarterly' רבעוני)

  useEffect(() => { // הוק לטעינת נתונים ראשונית בעת טעינת הדף
    const fetchAllData = async () => { // פונקציה אסינכרונית לביצוע פניות לשרת
      try { // תפיסת שגיאות
        const [projData, budgetData, expData, contData] = await Promise.all([ // ביצוע קריאות במקביל לטעינה מהירה
          api.getProjects(), // טעינת פרויקטים
          api.getBudgets(), // טעינת תקציבים
          api.getExpenses(), // טעינת הוצאות
          api.getContractors() // טעינת קבלנים
        ]); // המתנה לסיום כל הקריאות
        
        setProjects(projData); // עדכון מצב פרויקטים
        setBudgets(budgetData); // עדכון מצב תקציבים
        setExpenses(expData); // עדכון מצב הוצאות
        setContractors(contData); // עדכון מצב קבלנים
      } catch (error) { // במקרה של שגיאה בקריאות
        console.error("Failed to load reports data:", error); // הדפסת השגיאה ללוגים
      } finally { // בכל מקרה, בסיום הטעינה
        setLoading(false); // ביטול מצב הטעינה
      } // סיום הבלוק
    }; // סיום פונקציית הטעינה
    
    fetchAllData(); // ביצוע הטעינה בפועל
  }, []); // ריצה פעם אחת בלבד בעליית הרכיב

  if (loading) { // אם המערכת עדיין בטעינת נתונים
    return ( // נציג רכיב טעינה (ספינר) מונפש במרכז
      <div className="flex justify-center items-center p-24"> {/* תיבת מעטפת לטעינה */}
        <Loader2 className="animate-spin text-[var(--color-brand)] w-10 h-10" /> {/* אייקון ספינר מסתובב בצבע מותג */}
      </div> // סיום תיבת הטעינה
    ); // סיום ההחזרה
  } // סיום התנאי

  // חילוץ קטגוריות תקציב ייחודיות מתוך כלל התקציבים לצורך מילוי תיבת הבחירה במסנן
  const uniqueCategories = Array.from(new Set(budgets.map(b => b.category))).filter(Boolean); // מיפוי, ניקוי כפילויות ע"י Set, וסינון ערכים ריקים

  // החלת המסננים על רשימת ההוצאות שנציג
  const filteredExpenses = expenses.filter(exp => { // סינון מערך ההוצאות
    // מסנן לפי פרויקט נבחר
    if (selectedProject !== 'all' && Number(exp.project_id) !== Number(selectedProject)) return false; // אם נבחר פרויקט והוצאה זו לא שייכת לו, מסננים אותה החוצה
    // מסנן לפי קבלן מבצע
    if (selectedContractor !== 'all' && Number(exp.contractor_id) !== Number(selectedContractor)) return false; // אם נבחר קבלן וההוצאה לא משויכת אליו, מסננים אותה החוצה
    // מסנן לפי קטגוריית/סעיף תקציב
    if (selectedCategory !== 'all' && exp.budget_category !== selectedCategory) return false; // אם נבחר סעיף תקציב ספציפי וההוצאה אינה שייכת לו, מסננים אותה החוצה
    
    return true; // ההוצאה עברה את כל המסננים ותוצג
  }); // סיום סינון הוצאות

  // חישוב תקציבים מסוננים (מושפע רק מבחירת הפרויקט)
  const filteredBudgets = budgets.filter(b => { // סינון מערך התקציבים
    if (selectedProject !== 'all' && Number(b.project_id) !== Number(selectedProject)) return false; // אם נבחר פרויקט מסוים, נציג רק את סעיפי התקציב שלו
    return true; // התקציב עבר את הסינון
  }); // סיום סינון תקציבים

  // חישובי מדדים עיקריים (KPI) עבור הכרטיסים בראש העמוד
  const totalBudgetVal = filteredBudgets.reduce((sum, b) => sum + (b.total_amount || 0), 0); // סכימה של סך כל התקציבים המתוכננים לפי הסינון הנוכחי
  const totalExpensesVal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0); // סכימה של סך כל ההוצאות בפועל שעברו את המסננים
  const budgetLeft = totalBudgetVal - totalExpensesVal; // חישוב יתרת התקציב שנותרה לביצוע (חיובי או שלילי במקרה של חריגה)
  const utilizationPercent = totalBudgetVal > 0 ? (totalExpensesVal / totalBudgetVal) * 100 : 0; // חישוב אחוז ניצול התקציב יחסית לתוכנית

  // --- תרשים 1: התפלגות הוצאות לפי סעיף תקציבי (דיאגרמת עוגה) ---
  const categoryDataMap = {}; // אובייקט עזר לקיבוץ סכומי הוצאות לפי קטגוריות
  filteredExpenses.forEach(exp => { // מעבר על כל הוצאה מסוננת
    const cat = exp.budget_category || 'אחר / ללא סיווג'; // קביעת שם הקטגוריה (ברירת מחדל אם אין סיווג)
    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + exp.amount; // הוספת סכום ההוצאה לקטגוריה המתאימה
  }); // סיום המעבר
  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({ // המרת האובייקט למערך אובייקטים המותאם ל-Recharts
    name, // שם קטגוריית התקציב
    value // סך כל ההוצאות בקטגוריה
  })).sort((a, b) => b.value - a.value); // מיון הקטגוריות מהסכום הגבוה לנמוך

  // --- תרשים 2: התפלגות הוצאות לפי קבלן מבצע (תרשים עמודות) ---
  const contractorDataMap = {}; // אובייקט עזר לקיבוץ סכומי הוצאות לפי קבלנים
  filteredExpenses.forEach(exp => { // מעבר על כל הוצאה מסוננת
    const cont = exp.contractor_name || 'קבלן עצמאי / ספק'; // קביעת שם הקבלן (ברירת מחדל אם אין קבלן משויך)
    contractorDataMap[cont] = (contractorDataMap[cont] || 0) + exp.amount; // הוספת סכום ההוצאה לקבלן המתאים
  }); // סיום המעבר
  const contractorChartData = Object.entries(contractorDataMap).map(([name, value]) => ({ // המרת האובייקט למערך אובייקטים מתאים לתרשים עמודות
    name, // שם הקבלן
    value // סך כל התשלומים לקבלן זה
  })).sort((a, b) => b.value - a.value); // מיון הקבלנים מהתשלום הגבוה לנמוך

  // --- תרשים 3: מגמת הוצאות לאורך זמן (קיבוץ חודשי או רבעוני) ---
  const timeDataMap = {}; // אובייקט עזר לקיבוץ הוצאות לפי תקופות זמן
  filteredExpenses.forEach(exp => { // מעבר על כל הוצאה
    if (!exp.date) return; // אם להוצאה אין תאריך מוגדר, מדלגים עליה כדי למנוע שגיאות
    
    const year = exp.date.substring(0, 4); // חילוץ השנה מתוך מחרוזת התאריך (פורמט YYYY-MM-DD)
    const month = exp.date.substring(5, 7); // חילוץ החודש מתוך מחרוזת התאריך
    
    if (selectedTimePeriod === 'quarterly') { // אם המשתמש בחר פריסת זמן רבעונית
      const mVal = parseInt(month, 10); // המרת החודש למספר שלם
      let quarter = 'Q1'; // ברירת מחדל רבעון ראשון
      if (mVal > 9) quarter = 'רבעון 4'; // חודשים 10-12 משויכים לרבעון 4
      else if (mVal > 6) quarter = 'רבעון 3'; // חודשים 7-9 משויכים לרבעון 3
      else if (mVal > 3) quarter = 'רבעון 2'; // חודשים 4-6 משויכים לרבעון 2
      else quarter = 'רבעון 1'; // חודשים 1-3 משויכים לרבעון 1
      
      const key = `${quarter} - ${year}`; // הגדרת מפתח קיבוץ משולב של רבעון ושנה
      timeDataMap[key] = (timeDataMap[key] || 0) + exp.amount; // הוספת סכום ההוצאה לרבעון המתאים
    } else { // אם נבחרה תדירות חודשית (או כברירת מחדל)
      // הגדרת מערך שמות החודשים בעברית
      const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']; // שמות החודשים בעברית
      const mIdx = parseInt(month, 10) - 1; // חישוב האינדקס המתאים למערך (הפחתת 1 כי המערך מתחיל מ-0)
      const key = `${monthNames[mIdx] || month}/${year}`; // יצירת מפתח קיבוץ של שם החודש ושנה
      timeDataMap[key] = (timeDataMap[key] || 0) + exp.amount; // הוספת סכום ההוצאה לחודש המתאים
    } // סיום בחירת תדירות הזמן
  }); // סיום ריצה על הוצאות

  const timeChartData = Object.entries(timeDataMap).map(([label, value]) => ({ // המרת האובייקט למערך המותאם לתרשימי עמודות של Recharts
    label, // שם התקופה (למשל: ינואר/2026 או רבעון 1 - 2026)
    value // סכום ההוצאות בתקופה זו
  })); // סיום מיפוי הנתונים

  // פונקציה לייצוא רשימת ההוצאות המסוננת לקובץ Excel/CSV עם תמיכה מלאה בעברית
  const exportToCSV = () => { // הגדרת פונקציית הייצוא
    if (filteredExpenses.length === 0) { // בדיקה אם יש הוצאות להצגה במסננים הנוכחיים
      alert("אין נתונים לייצוא בטווח המסננים הנוכחי"); // הצגת הודעת אזהרה למשתמש
      return; // יציאה מהפונקציה
    } // סיום התנאי
    
    // הגדרת שורת כותרות העמודות בעברית תקינה
    const headers = ["מזהה", "פרויקט", "תיאור ההוצאה", "סעיף תקציב", "קבלן מבצע", "תאריך", "סכום (₪)"]; // כותרת הקובץ
    const rows = filteredExpenses.map(e => [ // מיפוי ההוצאות לשורות של נתונים בקובץ
      e.id, // מזהה ייחודי של ההוצאה
      e.project_name || "ללא פרויקט", // שם הפרויקט או ברירת מחדל
      e.description || "", // תיאור תוכנה של ההוצאה
      e.budget_category || "אחר", // סעיף התקציב המשויך
      e.contractor_name || "ספק כללי", // שם הקבלן המבצע
      e.date || "", // תאריך ההוצאה
      e.amount // סכום ההוצאה בשקלים
    ]); // סיום מיפוי השורות
    
    const csvContent = "\uFEFF" + [ // הוספת סימן BOM (Byte Order Mark) לתמיכה בעברית באקסל ללא ג'יבריש
      headers.join(","), // חיבור כותרות העמודות עם פסיקים
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")) // עטיפת ערכים במירכאות והחלפת מירכאות קיימות כדי לשמור על מבנה CSV
    ].join("\n"); // חיבור כל השורות באמצעות ירידת שורה
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" }); // יצירת קובץ בינארי מסוג CSV בקידוד UTF-8
    const url = URL.createObjectURL(blob); // יצירת קישור זמני להורדה בדפדפן
    const link = document.createElement("a"); // יצירת אלמנט קישור סמוי בדף
    link.setAttribute("href", url); // הגדרת יעד הקישור לקובץ שיצרנו
    link.setAttribute("download", `דוח_הוצאות_בארסוף_${new Date().toLocaleDateString('he-IL')}.csv`); // הגדרת שם הקובץ עם תאריך עדכני בעברית
    document.body.appendChild(link); // הוספת הקישור לגוף הדף על מנת שנוכל להפעיל אותו
    link.click(); // הפעלת הורדת הקובץ בצורה אוטומטית למשתמש
    document.body.removeChild(link); // הסרת אלמנט הקישור מהדף לאחר ביצוע ההורדה
  }; // סיום פונקציית הייצוא לקובץ

  return ( // החזרת תוכן ה-JSX לרינדור הממשק
    <div className="p-8 w-[96%] max-w-[1920px] mx-auto space-y-8 text-right" dir="rtl"> {/* מעטפת הדף - יישור לימין וכיוון RTL */}
      
      {/* כותרת הדף */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6"> {/* כותרת ראשית של עמוד הדוחות */}
        <div> {/* כותרת וטקסט הסבר */}
          <h1 className="text-2xl font-bold text-slate-800">דוחות וסטטיסטיקות</h1> {/* כותרת הדף בעברית */}
          <p className="text-slate-500 text-sm">מרכז מידע ניהולי לניתוח תקציבים והוצאות חוצי ארגון</p> {/* תיאור העמוד */}
        </div> {/* סיום אזור הטקסט */}
        <button  // כפתור לייצוא דוח ה-CSV
          onClick={exportToCSV} // הפעלת פונקציית הייצוא בלחיצה
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer" // עיצוב הכפתור
        > {/* גוף הכפתור */}
          <Download className="w-4 h-4" /> {/* אייקון הורדה */}
          ייצוא דוח מסונן (CSV) {/* כיתוב הכפתור בעברית */}
        </button> {/* סיום הכפתור */}
      </div> {/* סיום כותרת הדף */}

      {/* פאנל מסננים אינטראקטיבי */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"> {/* מעטפת פאנל המסננים */}
        <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2"> {/* כותרת הפאנל */}
          <Filter className="w-4 h-4 text-[var(--color-brand)]" /> {/* אייקון מסנן בצבע מותג */}
          מסנני דוחות חתך {/* טקסט כותרת */}
        </h3> {/* סיום כותרת הפאנל */}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"> {/* פריסת רשת ל-4 מסננים */}
          {/* פרויקט */}
          <div className="space-y-1.5"> {/* כותרת ותיבת בחירה לפרויקטים */}
            <label className="block text-xs font-semibold text-slate-500">בחר פרויקט</label> {/* תווית מעל המסנן */}
            <select  // תיבת בחירת הפרויקט
              value={selectedProject}  // ערך נבחר נוכחי
              onChange={e => setSelectedProject(e.target.value)} // עדכון המצב בשינוי
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all" // עיצוב התיבה
            > {/* אפשרויות */}
              <option value="all">כל הפרויקטים הפעילים</option> {/* אופציה לכלל הפרויקטים */}
              {projects.map(p => ( // מיפוי רשימת הפרויקטים לאפשרויות בתיבת הבחירה
                <option key={p.id} value={p.id}>{p.name}</option> // שורת בחירה לפרויקט בודד
              ))} {/* סיום המיפוי */}
            </select> {/* סיום תיבת הבחירה */}
          </div> {/* סיום מסנן פרויקט */}

          {/* קבלן */}
          <div className="space-y-1.5"> {/* כותרת ותיבת בחירה לקבלנים */}
            <label className="block text-xs font-semibold text-slate-500">בחר קבלן מבצע</label> {/* תווית מעל המסנן */}
            <select  // תיבת בחירת קבלן
              value={selectedContractor}  // ערך נבחר נוכחי
              onChange={e => setSelectedContractor(e.target.value)} // עדכון המצב בשינוי
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all" // עיצוב התיבה
            > {/* אפשרויות */}
              <option value="all">כל הקבלנים והספקים</option> {/* אופציה לכלל הקבלנים */}
              {contractors.map(c => ( // מיפוי רשימת הקבלנים לאפשרויות
                <option key={c.id} value={c.id}>{c.name}</option> // שורת בחירה לקבלן בודד
              ))} {/* סיום המיפוי */}
            </select> {/* סיום תיבת הבחירה */}
          </div> {/* סיום מסנן קבלן */}

          {/* סעיף תקציב */}
          <div className="space-y-1.5"> {/* כותרת ותיבת בחירה לסעיפי תקציב */}
            <label className="block text-xs font-semibold text-slate-500">בחר סעיף תקציב</label> {/* תווית מעל המסנן */}
            <select  // תיבת בחירת סעיף תקציב
              value={selectedCategory}  // ערך נבחר נוכחי
              onChange={e => setSelectedCategory(e.target.value)} // עדכון המצב בשינוי
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all" // עיצוב התיבה
            > {/* אפשרויות */}
              <option value="all">כל סעיפי התקציב</option> {/* אופציה לכלל הסעיפים */}
              {uniqueCategories.map((cat, idx) => ( // מיפוי הקטגוריות הייחודיות לאפשרויות
                <option key={idx} value={cat}>{cat}</option> // שורת בחירה לסעיף בודד
              ))} {/* סיום המיפוי */}
            </select> {/* סיום תיבת הבחירה */}
          </div> {/* סיום מסנן סעיף */}

          {/* חלוקת זמן */}
          <div className="space-y-1.5"> {/* כותרת ותיבת בחירה לפריסת זמן בגרפים */}
            <label className="block text-xs font-semibold text-slate-500">פריסת זמן בגרפים</label> {/* תווית מעל המסנן */}
            <select  // תיבת בחירת חלוקת הזמן
              value={selectedTimePeriod}  // ערך נבחר נוכחי
              onChange={e => setSelectedTimePeriod(e.target.value)} // עדכון המצב בשינוי
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all" // עיצוב התיבה
            > {/* אפשרויות */}
              <option value="all">חלוקה חודשית</option> {/* אופציה להצגה חודשית */}
              <option value="quarterly">חלוקה רבעונית</option> {/* אופציה להצגה רבעונית */}
            </select> {/* סיום תיבת הבחירה */}
          </div> {/* סיום מסנן זמן */}
        </div> {/* סיום הגריד */}
      </div> {/* סיום פאנל המסננים */}

      {/* כרטיסי סיכום KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6"> {/* פריסת רשת ל-4 כרטיסי מדדי מפתח */}
        <KpiCard  // כרטיס סה"כ תקציב מתוכנן
          title="סה״כ תקציב מתוכנן"  // כותרת הכרטיס
          value={formatCurrency(totalBudgetVal)}  // ערך כספי מפורמט
          icon={DollarSign}  // אייקון דולר (מייצג כסף ותקציב)
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס סה"כ הוצאות בפועל
          title="סה״כ הוצאות בפועל"  // כותרת הכרטיס
          value={formatCurrency(totalExpensesVal)}  // ערך הוצאות מפורמט
          icon={TrendingUp}  // אייקון מגמת עלייה
          status={totalExpensesVal > totalBudgetVal ? 'danger' : 'default'} // אם יש חריגה מהתקציב, הכרטיס יופיע באדום (danger)
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס יתרת תקציב לביצוע
          title="יתרת תקציב לביצוע"  // כותרת הכרטיס
          value={formatCurrency(budgetLeft)}  // ערך היתרה מפורמט
          icon={budgetLeft >= 0 ? CheckCircle : AlertTriangle}  // אייקון וי ירוק או סימן אזהרה כתום לפי מצב היתרה
          status={budgetLeft >= 0 ? 'success' : 'danger'} // ירוק להצלחה (success) אם נשאר תקציב, אדום לחריגה (danger)
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס אחוז ניצול תקציב
          title="אחוז ניצול תקציב"  // כותרת הכרטיס
          value={`${utilizationPercent.toFixed(1)}%`}  // אחוז ניצול מעוגל לספרה אחת אחרי הנקודה
          icon={BarChart3}  // אייקון גרף עמודות קטן
          status={utilizationPercent > 100 ? 'danger' : utilizationPercent > 80 ? 'warning' : 'default'} // צבעים לפי רמת הניצול (אדום לחריגה, צהוב לניצול גבוה, ברירת מחדל לרגיל)
        /> {/* סיום כרטיס */}
      </div> {/* סיום הגריד של כרטיסי KPI */}

      {/* אזור הגרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* פריסת רשת לשני גרפים ראשיים בשורה */}
        {/* גרף 1: התפלגות לפי סעיפים (Pie) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[400px]"> {/* מעטפת הגרף */}
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת הגרף */}
            <Layers className="w-4.5 h-4.5 text-blue-500" /> {/* אייקון שכבות בצבע כחול */}
            התפלגות הוצאות לפי סעיף תקציבי {/* שם הגרף בעברית */}
          </h3> {/* סיום הכותרת */}
          <div className="flex-1 min-h-0 relative"> {/* מיכל גמיש עבור רכיב הגרף של Recharts */}
            {categoryChartData.length > 0 ? ( // בדיקה אם יש נתונים להציג בגרף העוגה
              <ResponsiveContainer width="100%" height="100%"> {/* הפיכת הגרף לרספונסיבי בתוך המיכל */}
                <PieChart> {/* התחלת גרף עוגה */}
                  <Pie // הגדרת נתוני ומאפייני הדיאגרמה
                    data={categoryChartData} // מקור הנתונים
                    cx="50%" // מיקום מרכז העוגה בציר X
                    cy="50%" // מיקום מרכז העוגה בציר Y
                    innerRadius={60} // רדיוס פנימי (יוצר מראה של טבעת/דונאט מודרנית)
                    outerRadius={100} // רדיוס חיצוני
                    paddingAngle={3} // מרווח קטן בין פלחי העוגה
                    dataKey="value" // המפתח שממנו לוקחים את הערכים המספריים לסכימה
                  > {/* הגדרת צבעים נפרדים לפלחים */}
                    {categoryChartData.map((entry, index) => ( // מעבר על הפלחים
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> // החלת צבע שונה לכל פלח מתוך מערך הצבעים
                    ))} {/* סיום המיפוי */}
                  </Pie> {/* סיום הגדרת העוגה */}
                  <Tooltip content={<CustomTooltip />} /> {/* כלי עזר להצגת תיבת מידע בעברית בריחוף */}
                  <Legend  // מקרא הגרף בצד
                    layout="vertical"  // סידור רשומות המקרא בצורה אנכית
                    align="right"  // יישור המקרא לימין המיכל
                    verticalAlign="middle" // יישור אנכי למרכז
                    iconSize={10} // גודל אייקון הצבע
                    iconType="circle" // מראה האייקון כעיגול
                    formatter={(value) => <span className="text-[11px] text-slate-600 font-medium mr-2">{value}</span>} // עיצוב טקסט המקרא בעברית
                  /> {/* סיום מקרא הגרף */}
                </PieChart> {/* סיום דיאגרמת העוגה */}
              </ResponsiveContainer> /* סיום מיכל רספונסיבי */
            ) : ( // אם אין נתונים בטווח המסננים
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div> // הצגת הודעה מתאימה
            )} {/* סיום תנאי הנתונים */}
          </div> {/* סיום מיכל הגרף */}
        </div> {/* סיום אזור גרף 1 */}

        {/* גרף 2: הוצאות לאורך זמן (Bar) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[400px]"> {/* מעטפת הגרף */}
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת הגרף */}
            <Calendar className="w-4.5 h-4.5 text-indigo-500" /> {/* אייקון לוח שנה בצבע אינדיגו */}
            מגמת הוצאות לאורך זמן ({selectedTimePeriod === 'quarterly' ? 'רבעוני' : 'חודשי'}) {/* שם הגרף בעברית משתנה לפי בחירת המשתמש */}
          </h3> {/* סיום כותרת הגרף */}
          <div className="flex-1 min-h-0"> {/* מיכל גמיש עבור הגרף */}
            {timeChartData.length > 0 ? ( // בדיקה אם קיימים נתונים לגרף הזמן
              <ResponsiveContainer width="100%" height="100%"> {/* התאמה לגודל המיכל */}
                <BarChart data={timeChartData}> {/* גרף עמודות של Recharts */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /> {/* רשת רקע עדינה בגרף */}
                  <XAxis  // הגדרת ציר ה-X (תקופות הזמן)
                    dataKey="label"  // המפתח שממנו נלקחות תוויות הציר
                    stroke="#94a3b8"  // צבע הקו והטקסט
                    fontSize={10}  // גודל הגופן
                    tickLine={false} // ביטול קווי השנתות הקטנים
                  /> {/* סיום ציר X */}
                  <YAxis  // הגדרת ציר ה-Y (סכומים כספיים)
                    stroke="#94a3b8"  // צבע
                    fontSize={10}  // גודל גופן
                    tickLine={false} // ביטול שנתות
                    tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} // עיצוב סכומי הציר בפורמט קצר (למשל ₪150k במקום 150000)
                    orientation="right" // הצגת ציר ה-Y בצד ימין (מתאים לשפה העברית)
                  /> {/* סיום ציר Y */}
                  <Tooltip content={<CustomTooltip />} /> {/* תיבת מידע עשירה בריחוף */}
                  <Bar dataKey="value" fill="var(--color-brand)" name="הוצאה בפועל" radius={[4, 4, 0, 0]} /> {/* עמודות הגרף בצבע מותג עם פינות עליונות מעוגלות */}
                </BarChart> {/* סיום גרף העמודות */}
              </ResponsiveContainer> /* סיום מיכל רספונסיבי */
            ) : ( // אם אין נתונים
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div> // הודעת אין נתונים להצגה
            )} {/* סיום תנאי הנתונים */}
          </div> {/* סיום מיכל הגרף */}
        </div> {/* סיום אזור גרף 2 */}

        {/* גרף 3: הוצאות לפי קבלן (Bar - רוחב מלא) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]"> {/* מעטפת הגרף התופסת את מלוא הרוחב בגריד (2 עמודות) */}
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת */}
            <Users className="w-4.5 h-4.5 text-emerald-500" /> {/* אייקון משתמשים/קבלנים בצבע ברקת */}
            התפלגות תשלומים לפי קבלנים וספקים {/* כותרת הגרף בעברית */}
          </h3> {/* סיום כותרת */}
          <div className="flex-1 min-h-0"> {/* מיכל גמיש עבור תרשים קבלנים */}
            {contractorChartData.length > 0 ? ( // בדיקה אם יש נתונים על קבלנים
              <ResponsiveContainer width="100%" height="100%"> {/* התאמה לגודל המיכל */}
                <BarChart data={contractorChartData} layout="vertical"> {/* גרף עמודות אופקי (layout="vertical") להצגה נוחה של שמות ארוכים */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /> {/* רשת רקע עדינה */}
                  <XAxis  // ציר ה-X מציג כעת את הערכים המספריים (סכום) בגלל הפריסה האופקית
                    type="number" // הגדרת סוג הציר כמספר
                    stroke="#94a3b8"  // צבע
                    fontSize={10}  // גודל גופן
                    tickLine={false} // ביטול שנתות
                    tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`} // עיצוב הערכים הכספיים
                  /> {/* סיום ציר X */}
                  <YAxis  // ציר ה-Y מציג כעת את שמות הקבלנים
                    dataKey="name"  // תוויות הציר הן שמות הקבלנים
                    type="category" // סוג הציר הוא קטגוריות טקסטואליות
                    stroke="#94a3b8"  // צבע
                    fontSize={10}  // גודל גופן
                    tickLine={false} // ביטול שנתות
                    orientation="right" // הצגת הציר בצד ימין לתצוגה נוחה בעברית
                    width={150} // רוחב מוקצב לתוויות כדי ששמות קבלנים לא ייחתכו
                  /> {/* סיום ציר Y */}
                  <Tooltip content={<CustomTooltip />} /> {/* תיבת מידע עשירה בריחוף */}
                  <Bar dataKey="value" fill="#0d9488" name='סה"כ שולם' radius={[0, 4, 4, 0]} /> {/* העמודות האופקיות בצבע טורקיז ופינות שמאליות מעוגלות */}
                </BarChart> {/* סיום הגרף */}
              </ResponsiveContainer> /* סיום מיכל רספונסיבי */
            ) : ( // אם אין נתוני קבלנים
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div> // הודעת אין נתונים להצגה
            )} {/* סיום תנאי הנתונים */}
          </div> {/* סיום מיכל הגרף */}
        </div> {/* סיום אזור גרף 3 */}
      </div> {/* סיום אזור הגרפים הכללי */}

      {/* טבלת פירוט הוצאות מסוננת */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"> {/* מעטפת חיצונית מעוגלת לטבלה המפורטת */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"> {/* כותרת הטבלה וסיכום מספר שורות */}
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"> {/* כותרת הטבלה */}
            <FileText className="w-4.5 h-4.5 text-slate-600" /> {/* אייקון מסמך טקסט */}
            רשימת הוצאות מפורטת {/* כותרת הטבלה בעברית */}
          </h3> {/* סיום כותרת */}
          <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg"> {/* תגית מספר הרשומות שנמצאו */}
            נמצאו {filteredExpenses.length} רשומות תואמות {/* כמות הרשומות בעברית */}
          </span> {/* סיום תגית */}
        </div> {/* סיום חלק עליון של הטבלה */}

        <div className="overflow-x-auto"> {/* הגדרת גלילה אופקית כדי למנוע חיתוך של הטבלה במסכים קטנים */}
          {filteredExpenses.length > 0 ? ( // בדיקה אם יש הוצאות להציג בטבלה
            <table className="w-full text-right text-xs border-collapse"> {/* אלמנט הטבלה הראשי - מיושר לימין */}
              <thead> {/* כותרות העמודות בטבלה */}
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100"> {/* שורת כותרת מעוצבת ובהירה */}
                  <th className="p-3.5 w-12 text-center">#</th> {/* מספר שורה סידורי */}
                  <th className="p-3.5">פרויקט</th> {/* שם הפרויקט */}
                  <th className="p-3.5">תיאור ההוצאה</th> {/* פירוט קצר על ההוצאה */}
                  <th className="p-3.5">קבלן מבצע</th> {/* הקבלן/ספק שאליו שולם הכסף */}
                  <th className="p-3.5">סעיף תקציבי</th> {/* סיווג סעיף התקציב המשויך */}
                  <th className="p-3.5 w-24 text-center">תאריך</th> {/* תאריך ביצוע התשלום */}
                  <th className="p-3.5 w-32 text-left">סכום</th> {/* סכום התשלום - מיושר לשמאל */}
                </tr> {/* סיום שורת הכותרת */}
              </thead> {/* סיום כותרות עמודה */}
              <tbody className="divide-y divide-slate-100 text-slate-700"> {/* גוף הטבלה עם קווי הפרדה עדינים */}
                {filteredExpenses.map((exp, idx) => ( // מעבר על כל הוצאה מסוננת ורינדור שורה עבורה בטבלה
                  <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors"> {/* שורת נתונים עם אפקט מעבר בריחוף */}
                    <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td> {/* הצגת אינדקס השורה (מתחיל מ-1) */}
                    <td className="p-3.5 font-bold text-slate-800">{exp.project_name || 'כללי'}</td> {/* הצגת שם הפרויקט */}
                    <td className="p-3.5 text-slate-600 font-medium">{exp.description}</td> {/* הצגת תיאור ההוצאה */}
                    <td className="p-3.5 text-slate-600 font-medium">{exp.contractor_name || 'ספק כללי'}</td> {/* הצגת שם הקבלן או ברירת מחדל */}
                    <td className="p-3.5"> {/* תא סעיף התקציב */}
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px]"> {/* תגית מעוצבת בצבע כחול עבור סעיף התקציב */}
                        {exp.budget_category || 'כללי / אחר'} {/* שם סעיף התקציב */}
                      </span> {/* סיום תגית */}
                    </td> {/* סיום תא סעיף */}
                    <td className="p-3.5 text-center text-slate-500 font-medium"> {/* תא תאריך */}
                      {exp.date ? new Date(exp.date).toLocaleDateString('he-IL') : '—'} {/* עיצוב תאריך לפי סגנון עברי מקומי או קו מפריד אם חסר */}
                    </td> {/* סיום תא תאריך */}
                    <td className="p-3.5 text-left font-mono font-bold text-slate-800"> {/* תא סכום כספי - פונט מונוספייס ומיושר לשמאל */}
                      {exp.amount?.toLocaleString('he-IL')} ₪ {/* פורמט אלפים עברי וסימן שקלים */}
                    </td> {/* סיום תא סכום */}
                  </tr> // סיום שורת נתונים
                ))} {/* סיום המיפוי */}
              </tbody> {/* סיום גוף הטבלה */}
            </table> // סיום הטבלה
          ) : ( // אם הטבלה ריקה (אין נתונים תואמים למסננים)
            <div className="p-8 text-center text-slate-400 text-xs italic">לא נמצאו הוצאות התואמות למסננים שנבחרו.</div> // הודעת טבלה ריקה
          )} {/* סיום תנאי הנתונים */}
        </div> {/* סיום מיכל הטבלה */}
      </div> {/* סיום אזור הטבלה */}
    </div> // סיום המעטפת הראשי
  ); // סיום ההחזרה
} // סיום רכיב הדוחות
