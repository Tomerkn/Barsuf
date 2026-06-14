import React, { useEffect, useState } from 'react'; // ייבוא ריאקט והוקס למחזור חיים ומצבים
import { useParams } from 'react-router-dom'; // הוק לשליפת מזהה הפרויקט מהכתובת בדפדפן
import { api } from '../services/api'; // ייבוא שירותי ה-API לתקשורת עם השרת
import { 
  Loader2, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, 
  Calendar, Layers, BarChart3, Database, Key, CheckSquare, Clock,
  ToggleLeft, ToggleRight, ArrowUpRight, PlusCircle 
} from 'lucide-react'; // ייבוא אייקונים מעוצבים מספריית lucide-react
import { KpiCard } from '../components/ui/KpiCard'; // ייבוא רכיב כרטיס מדדי ביצוע (KPI)
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, 
  CartesianGrid, PieChart, Pie, Cell, Legend 
} from 'recharts'; // ייבוא רכיבי תרשימים מספריית Recharts ליצירת גרפים

const COLORS = ['#6161ff', '#0d9488', '#ea580c', '#94a3b8']; // הגדרת צבעי מותג לגרפים (Monday סגול, טורקיז, כתום, אפור)

export function MondayIntegration() { // פונקציית הרכיב הראשי של דף האינטגרציה
  const { projectId } = useParams(); // שליפת מזהה הפרויקט הנוכחי מתוך הכתובת
  const [loading, setLoading] = useState(true); // מצב המציין האם אנו בטעינה ראשונית
  const [syncing, setSyncing] = useState(false); // מצב המציין האם מתבצע כעת סנכרון פעיל מול מאנדיי
  const [provisioning, setProvisioning] = useState(false); // מצב המציין האם אנו מקימים כעת לוח חדש במאנדיי
  const [provisioningPremium, setProvisioningPremium] = useState(false); // מצב להקמת לוח פרימיום מובנה
  const [activeGuideTab, setActiveGuideTab] = useState('gantt'); // טאב פעיל למדריך לוח המחוונים
  const [tasks, setTasks] = useState([]); // מצב לשמירת המשימות המסונכרנות מהמסד
  const [project, setProject] = useState(null); // מצב לשמירת נתוני הפרויקט הנוכחי
  
  // פרטי החיבור של מאנדיי (מפתח גישה ומזהה לוח) השמורים בשרת או כברירת מחדל
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI');
  const [boardId, setBoardId] = useState(''); // מזהה לוח ריק בתחילה
  const [autoSync, setAutoSync] = useState(true); // סימון סנכרון אוטומטי פעיל כברירת מחדל
  const [connectionSaved, setConnectionSaved] = useState(false); // מצב להצגת אישור שמירת פרטי חיבור

  const fetchProjectAndTasks = async () => { // פונקציה אסינכרונית לטעינת משימות ופרויקט
    try { // תפיסת שגיאות רשת
      const [allProjects, tasksData] = await Promise.all([ // טעינת פרויקטים ומשימות במקביל
        api.getProjects(), // טעינת כל הפרויקטים
        api.getProjectTasks(projectId) // טעינת המשימות של פרויקט זה
      ]); // המתנה לסיום
      
      const currentProj = allProjects.find(p => p.id === Number(projectId)); // מציאת הפרויקט הנוכחי ברשימה
      if (currentProj) { // אם נמצא פרויקט
        setProject(currentProj); // שמירת נתוני הפרויקט במצב
        if (currentProj.monday_token) setToken(currentProj.monday_token); // אם שמור טוקן בשרת, נטען אותו
        if (currentProj.monday_board_id) setBoardId(currentProj.monday_board_id); // אם שמור מזהה לוח בשרת, נטען אותו
        setAutoSync(currentProj.monday_auto_sync === 1); // טעינת הגדרת הסנכרון האוטומטי
      } // סיום התנאי
      
      setTasks(tasksData || []); // עדכון המצב במשימות שהתקבלו
    } catch (error) { // במקרה של כשל
      console.error('Failed to load project details and tasks:', error); // הדפסת שגיאה ללוג
    } finally { // בכל מקרה
      setLoading(false); // סיום מצב טעינה ראשונית
    } // סיום הבלוק
  }; // סיום פונקציית הטעינה

  useEffect(() => { // הוק לטעינה אוטומטית ברגע שהדף עולה
    fetchProjectAndTasks(); // קריאה לפונקציית הטעינה המשותפת
  }, [projectId]); // האזנה למזהה הפרויקט

  const handleSaveCredentials = async (e) => { // פונקציה לשמירת פרטי החיבור בשרת ובדפדפן
    e.preventDefault(); // מניעת רענון הדף
    try { // תפיסת שגיאות
      await api.saveMondayCredentials(projectId, token, boardId, autoSync); // שמירת ההגדרות ב-SQLite בשרת
      setConnectionSaved(true); // עדכון מצב שמירה להצגת הודעת הצלחה
      setTimeout(() => setConnectionSaved(false), 3000); // העלמת הודעת ההצלחה לאחר 3 שניות
      await fetchProjectAndTasks(); // רענון הנתונים
    } catch (err) { // כשל בשמירה
      alert('שגיאה בשמירת פרטי החיבור בשרת: ' + err.message); // התראה למשתמש
    }
  }; // סיום שמירת הפרטים

  const handleAutoProvision = async () => { // פונקציה להקמת לוח פרויקט חדש אוטומטית ב-Monday
    if (!token) { // בדיקה שקיים מפתח גישה
      alert('נא להזין מפתח גישה (Token) תקין לצורך יצירת לוח'); // אזהרה
      return; // יציאה
    } // סיום תנאי
    
    if (!window.confirm('האם ליצור לוח פרויקט חדש ב-Monday ולייצא אליו את כל המשימות הנוכחיות?')) return; // אישור מהמשתמש
    
    setProvisioning(true); // הפעלת מצב הקמה (אנימציה)
    try { // ביצוע ההקמה בשרת
      const res = await api.exportProjectToMonday(projectId, token); // קריאה ל-API להקמה וייצוא משימות
      alert(`הלוח הוקם בהצלחה! מזהה הלוח: ${res.boardId}. סונכרנו ${res.exported} משימות.`); // הצלחה
      setBoardId(res.boardId); // עדכון מזהה הלוח החדש בדף
      await fetchProjectAndTasks(); // רענון הנתונים מהמסד המעודכן
    } catch (err) { // כשל
      alert('נכשל בהקמת לוח ב-Monday: ' + err.message); // אזהרה
    } finally { // סיום
      setProvisioning(false); // ביטול מצב הקמה
    } // סיום הבלוק
  }; // סיום פונקציית הקמה

  const handlePremiumProvision = async () => { // פונקציה להקמת לוח בנייה פרימיום מובנה במאנדיי
    if (!token) { // בדיקה שקיים מפתח גישה
      alert('נא להזין מפתח גישה (Token) תקין לצורך יצירת לוח'); // אזהרה
      return; // יציאה
    } // סיום תנאי
    
    if (!window.confirm('האם ליצור לוח בנייה פרימיום חדש ב-Monday? הלוח יחולק ל-5 שלבי בנייה סטנדרטיים עם עמודות תקציב, עלויות, עדיפות וסטטוס.')) return; // אישור
    
    setProvisioningPremium(true); // הפעלת מצב הקמה
    try { // ביצוע ההקמה בשרת
      const res = await api.exportPremiumProjectToMonday(projectId, token); // קריאה ל-API
      alert(`לוח הבנייה פרימיום הוקם בהצלחה! מזהה הלוח: ${res.boardId}. סונכרנו ${res.exported} משימות ב-5 שלבי בנייה.`); // הצלחה
      setBoardId(res.boardId); // עדכון מזהה הלוח החדש
      await fetchProjectAndTasks(); // רענון הנתונים
    } catch (err) { // כשל
      alert('נכשל בהקמת לוח בנייה פרימיום ב-Monday: ' + err.message); // אזהרה
    } finally { // סיום
      setProvisioningPremium(false); // ביטול מצב הקמה
    } // סיום הבלוק
  }; // סיום פונקציית הקמת לוח פרימיום

  const handleSync = async () => { // פונקציה להפעלת סנכרון אסינכרונית מול Monday.com (משיכה)
    if (!token || !boardId) { // בדיקה שפרטי החיבור אינם ריקים
      alert('נא להזין מפתח גישה (Token) ומזהה לוח (Board ID) תקינים'); // הודעת אזהרה
      return; // יציאה מוקדמת
    } // סיום תנאי בדיקה
    
    setSyncing(true); // הפעלת מצב סנכרון (אנימציית טעינה)
    try { // ניסיון ביצוע הסנכרון
      const result = await api.syncMonday(projectId, token, boardId); // קריאה ל-API לביצוע הסנכרון בשרת
      alert(`סנכרון הושלם בהצלחה! סונכרנו ${result.synced} משימות ממאנדיי.`); // הודעת הצלחה
      await fetchProjectAndTasks(); // רענון רשימת המשימות
    } catch (error) { // במקרה של שגיאה בסנכרון
      alert(`שגיאה בסנכרון מול מאנדיי: ${error.message}`); // הצגת הודעת שגיאה מפורטת למשתמש
    } finally { // בסיום התהליך
      setSyncing(false); // כיבוי מצב סנכרון
    } // סיום בלוק תפיסת השגיאות
  }; // סיום פונקציית הסנכרון

  const handleDisconnect = async () => { // פונקציה לניתוק החיבור של הפרויקט ל-Monday.com
    if (!window.confirm('האם אתה בטוח שברצונך לנתק את החיבור ל-Monday.com? זה יפסיק את הסנכרון האוטומטי.')) return;
    try {
      await api.saveMondayCredentials(projectId, null, null, false);
      setToken('');
      setBoardId('');
      setAutoSync(false);
      alert('החיבור ל-Monday.com נותק בהצלחה.');
      await fetchProjectAndTasks();
    } catch (err) {
      alert('שגיאה בניתוק החיבור: ' + err.message);
    }
  };

  if (loading) { // אם המערכת בטעינת נתונים ראשונית
    return ( // נציג רכיב טעינה מונפש במרכז
      <div className="flex justify-center items-center p-24"> {/* מיכל לטעינה */}
        <Loader2 className="animate-spin text-[var(--color-brand)] w-10 h-10" /> {/* אייקון ספינר מונפש */}
      </div> // סיום מיכל הטעינה
    ); // סיום החזרה
  } // סיום תנאי טעינה

  // חישוב המדדים (KPIs) עבור כרטיסי המידע
  const totalTasks = tasks.length; // סה"כ משימות
  const completedTasks = tasks.filter(t => t.progress === 100).length; // משימות שהושלמו
  const inProgressTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length; // משימות בתהליך עבודה
  const notStartedTasks = tasks.filter(t => t.progress === 0).length; // משימות שעדיין לא התחילו
  
  // חישוב משימות בעיכוב (תאריך היעד עבר וההתקדמות קטנה מ-100%)
  const todayStr = new Date().toISOString().split('T')[0]; // קבלת תאריך היום בפורמט YYYY-MM-DD
  const overdueTasks = tasks.filter(t => t.progress < 100 && t.end_date && t.end_date < todayStr).length; // סינון משימות בעיכוב

  // סריקה ויצירת התראות מערכת דינמיות על סמך נתוני המשימות
  const alertsList = []; // מערך ריק שיחזיק את רשימת ההתראות
  tasks.forEach(task => { // מעבר על כל משימה
    if (task.progress < 100 && task.end_date && task.end_date < todayStr) { // תנאי למשימה בעיכוב
      alertsList.push({ // הוספת התראה אדומה
        id: `overdue-${task.id}`, // מזהה התראה
        type: 'danger', // רמת חומרה גבוהה
        title: 'משימה בעיכוב ביצוע', // כותרת ההתראה
        message: `המשימה "${task.name}" הייתה אמורה להסתיים ב-${new Date(task.end_date).toLocaleDateString('he-IL')}, אך התקדמותה היא ${task.progress}% בלבד.`, // פירוט השגיאה
        icon: AlertCircle // אייקון שגיאה
      }); // סיום הוספה
    } else if (task.progress === 0 && task.start_date && task.start_date < todayStr) { // תנאי למשימה שלא התחילה בזמן
      alertsList.push({ // הוספת התראה כתומה
        id: `start-delay-${task.id}`, // מזהה התראה
        type: 'warning', // רמת חומרה בינונית
        title: 'עיכוב בתחילת עבודה', // כותרת ההתראה
        message: `המשימה "${task.name}" תוכננה להתחיל ב-${new Date(task.start_date).toLocaleDateString('he-IL')}, אך התקדמותה היא 0% וטרם בוצע בה דבר.`, // פירוט
        icon: AlertTriangle // אייקון אזהרה
      }); // סיום הוספה
    } else if (task.progress < 100 && task.end_date) { // בדיקה למשימות שמסתיימות בקרוב
      const diffTime = new Date(task.end_date) - new Date(); // הפרש זמנים במילישניות
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // המרת הפרש לימים שלמים
      if (diffDays >= 0 && diffDays <= 3) { // אם המשימה מסתיימת בתוך 3 הימים הקרובים
        alertsList.push({ // הוספת התראה כחולה
          id: `ends-soon-${task.id}`, // מזהה התראה
          type: 'info', // רמת חומרה נמוכה/מידע
          title: 'משימה לקראת סיום', // כותרת
          message: `המשימה "${task.name}" צפויה להסתיים ב-${new Date(task.end_date).toLocaleDateString('he-IL')} (בעוד ${diffDays} ימים).`, // פירוט
          icon: Clock // אייקון שעון
        }); // סיום הוספה
      } // סיום בדיקת ימים
    } // סיום התנאים
  }); // סיום לולאת המשימות

  // --- הכנת נתונים לגרף עוגה (התפלגות סטטוס משימות) ---
  const pieChartData = [ // בניית מערך הנתונים
    { name: 'הושלמו', value: completedTasks }, // כמות שהושלמו
    { name: 'בביצוע', value: inProgressTasks }, // כמות בביצוע
    { name: 'טרם החלו', value: notStartedTasks }, // כמות שלא התחילו
    { name: 'בעיכוב', value: overdueTasks } // כמות בעיכוב
  ].filter(item => item.value > 0); // סינון ערכים השווים ל-0 כדי למנוע גרף ריק

  // --- הכנת נתונים לגרף עמודות אופקי (התקדמות משימות מפתח) ---
  const barChartData = tasks.slice(0, 7).map(task => ({ // לקיחת 7 המשימות הראשונות
    name: task.name.length > 20 ? task.name.substring(0, 20) + '...' : task.name, // קיצור שם המשימה במידת הצורך
    'התקדמות %': task.progress // אחוז ההתקדמות לציר הגרף
  })); // סיום מיפוי

  return ( // החזרת ה-JSX לרינדור הממשק
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl"> {/* מעטפת הדף - יישור לימין וכיוון RTL */}
      
      {/* כותרת הדף */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6"> {/* כותרת ראשית */}
        <div> {/* כותרת והסבר */}
          <div className="flex items-center gap-3"> {/* מיכל כותרת עם לוגו מותאם של Monday */}
            <span className="w-8 h-8 rounded-lg bg-[#6161ff] flex items-center justify-center text-white text-base font-extrabold shadow-sm">M</span> {/* מותג Monday */}
            <h1 className="text-2xl font-bold text-slate-800">אינטגרציה וניהול Monday.com</h1> {/* כותרת */}
          </div> {/* סיום כותרת מותג */}
          <p className="text-slate-500 text-sm mt-1.5">סנכרון לוחות זמנים, משימות ואחוזי התקדמות ישירות מלוחות ה-WBS בארגון</p> {/* תיאור */}
        </div> {/* סיום אזור טקסט */}
        
        <div className="flex items-center gap-3 self-start md:self-auto"> {/* קבוצת כפתורים */}
          <button // כפתור להקמת לוח אוטומטית במאנדיי
            onClick={handleAutoProvision}
            disabled={provisioning || syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            {provisioning ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                מקים לוח במאנדיי...
              </>
            ) : (
              <>
                <PlusCircle className="w-4.5 h-4.5" />
                צור לוח פרויקט חדש ב-Monday
              </>
            )}
          </button>

          <button // כפתור להפעלת סנכרון ידני מיידי (משיכה)
            onClick={handleSync} // הפעלת הסנכרון בלחיצה
            disabled={syncing || provisioning} // ביטול הכפתור בזמן סנכרון פעיל
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6161ff] hover:bg-[#4d4dcc] disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed" // עיצוב הכפתור
          > {/* גוף הכפתור */}
            {syncing ? ( // אם אנחנו בסנכרון פעיל
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" /> {/* אייקון ספינר מסתובב */}
                מסתנכרן מול מאנדיי... {/* כיתוב טעינה */}
              </>
            ) : ( // אם לא בסנכרון
              <>
                <RefreshCw className="w-4.5 h-4.5" /> {/* אייקון רענון */}
                משוך נתונים מ-Monday.com {/* כיתוב כפתור */}
              </>
            )}
          </button> {/* סיום הכפתור */}
        </div>
      </div> {/* סיום כותרת עמוד */}

      {/* אשף חיבור מהיר ל-Monday.com או תצוגת הגדרות סנכרון */}
      {!boardId ? (
        // === Disconnected / Wizard State ===
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 p-6">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#6161ff]" />
              אשף חיבור מהיר ל-Monday.com
            </h3>
            <p className="text-slate-500 text-xs mt-1.5">הפרויקט אינו מחובר ל-Monday.com. בחר אחת מבין האפשרויות הבאות כדי להתחיל בסנכרון.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-100">
            {/* Option A: Premium Construction Board Provisioning */}
            <div className="p-6 space-y-6 flex flex-col justify-between bg-gradient-to-b from-emerald-50/20 to-transparent">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">א</span>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    הקמת לוח בנייה פרימיום
                    <span className="inline-flex px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[8px] font-extrabold animate-pulse">מובנה ומומלץ</span>
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  הקמת לוח בנייה מלא ומובנה המחולק ל-5 שלבי הבנייה המרכזיים (תכנון, יסודות, שלד, גמרים, מסירה) כולל עמודות תקציב מתוכנן, עלות בפועל, עדיפות, סטטוס ביצוע, ואחוז התקדמות.
                </p>
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] font-semibold text-slate-500">API Token מפתח גישה אישי</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="הזן מפתח גישה של Monday.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handlePremiumProvision}
                  disabled={provisioningPremium || !token}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  {provisioningPremium ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מקים לוח בנייה פרימיום...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      הקם לוח פרימיום וסווג משימות
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Option B: Basic Auto-Provisioning */}
            <div className="p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">ב</span>
                  <h4 className="font-bold text-sm text-slate-800">הקמת לוח פרויקט בסיסי</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  הקמת לוח משימות פשוט ושטוח המייצא את כל משימות הפרויקט הנוכחיות עם עמודות לוח זמנים (Timeline) ואחוז התקדמות (Numbers) בלבד.
                </p>
                <div className="space-y-1.5 pt-2">
                  <label className="block text-[10px] font-semibold text-slate-500">API Token מפתח גישה אישי</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="הזן מפתח גישה של Monday.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleAutoProvision}
                  disabled={provisioning || !token}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {provisioning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מקים לוח פרויקט בסיסי...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      צור לוח פרויקט בסיסי ומזג
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Option C: Link Existing Board */}
            <div className="p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-bold">ג</span>
                  <h4 className="font-bold text-sm text-slate-800">קישור ללוח משימות קיים</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  אם כבר קיים לוח תואם ב-Monday.com שברצונך לקשר במקום להקים לוח חדש, תוכל להזין ידנית את מזהה הלוח ומפתח הגישה לקישור מיידי.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-slate-500">API Token</label>
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="הזן מפתח גישה"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#6161ff] focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-slate-500">Board ID</label>
                    <input
                      type="text"
                      value={boardId}
                      onChange={e => setBoardId(e.target.value)}
                      placeholder="למשל: 5089388529"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#6161ff] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={!token || !boardId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6161ff] hover:bg-[#4d4dcc] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  קשר לוח קיים וסנכרן נתונים
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // === Connected State ===
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Connection Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-[#6161ff]" />
                  חיבור פעיל מול Monday.com
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                    <span className="text-xs text-slate-500 font-bold">סטטוס חיבור</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                      מחובר ומסונכרן
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">קישור ללוח</span>
                    <a
                      href={`https://monday-class-colman-q2-2026.monday.com/boards/${boardId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#6161ff] hover:underline font-bold"
                    >
                      פתח לוח במאנדיי
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">מזהה לוח (Board ID)</span>
                    <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">{boardId}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  נתק חיבור ל-Monday.com
                </button>
              </div>
            </div>

            {/* Connection Settings Form */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                <Key className="w-4.5 h-4.5 text-[var(--color-brand)]" />
                הגדרות סנכרון ואינטגרציה
              </h3>
              
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">API Token מפתח גישה</label>
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="הזן מפתח גישה חדש לעדכון"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500">מזהה לוח (Board ID)</label>
                    <input
                      type="text"
                      value={boardId}
                      onChange={e => setBoardId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Auto sync toggle */}
                <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAutoSync(!autoSync)}
                    className="text-[var(--color-brand)] focus:outline-none cursor-pointer"
                  >
                    {autoSync ? (
                      <ToggleRight className="w-9 h-9" />
                    ) : (
                      <ToggleLeft className="w-9 h-9 text-slate-400" />
                    )}
                  </button>
                  <div className="text-right">
                    <h5 className="text-xs font-bold text-slate-800">סנכרון דו-כיווני אוטומטי בזמן אמת</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">כל הוספה, עדכון או מחיקה של משימה באפליקציה תתעדכן מיידית בלוח ה-Monday שלך</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    עדכן הגדרות חיבור
                  </button>

                  {connectionSaved && (
                    <span className="text-emerald-600 text-xs font-bold flex items-center gap-1 animate-fade-in">
                      <CheckCircle className="w-4 h-4" />
                      ההגדרות עודכנו בהצלחה!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Premium Monday Dashboard Setup Guide */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-[#6161ff]" />
                  מדריך להקמת לוח מחוונים (Dashboard) מקצועי ב-Monday.com
                </h3>
                <p className="text-slate-500 text-[11px] mt-1">
                  המלצות וטיפים מעשיים להוספת וידג׳טים בלוח ה-Monday שלך להצגת התמונה המלאה של פרויקט הבנייה
                </p>
              </div>
              
              {/* Tab selectors */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('gantt')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeGuideTab === 'gantt' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  תרשים גאנט (Gantt)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('battery')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeGuideTab === 'battery' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  אחוז התקדמות (Battery)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('budget')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeGuideTab === 'budget' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  תקציבים ועלויות (Numbers)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGuideTab('charts')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeGuideTab === 'charts' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  תרשימי השוואה (Charts)
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeGuideTab === 'gantt' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">מבט על לוחות זמנים</span>
                    <h4 className="text-base font-bold text-slate-800">וידג׳ט גאנט (Gantt Chart Widget)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      מאפשר לך לעקוב אחר נתיב קריטי של פרויקט הבנייה, התלויות בין משימות ולוחות זמנים של כל קבלני המשנה בפריסה ויזואלית.
                    </p>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-700">איך להקים במאנדיי?</h5>
                      <ul className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pr-1">
                        <li>פתח את הלוח שנוצר ב-Monday.com.</li>
                        <li>לחץ על כפתור ה-<strong>+</strong> (Add View) בראש הלוח.</li>
                        <li>בחר ב-<strong>Gantt</strong> מרשימת התצוגות.</li>
                        <li>הגדר את הגאנט שיקרא את עמודת <strong>"לוח זמנים"</strong> כציר הזמן שלו.</li>
                        <li>קבע את הקיבוץ (Group by) לפי <strong>"Group"</strong> להצגה לפי 5 שלבי הבנייה.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-center bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100/50">
                    <div className="w-full max-w-[320px] bg-white rounded-xl shadow-md p-4 space-y-3 font-sans text-right" dir="rtl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-800">תרשים Gantt פרויקט</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6161ff]"></span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>תכנון ורישוי</span>
                            <span>14/06 - 20/06</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 right-2 w-[40%] bg-indigo-500 h-full rounded-full"></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>תשתיות ויסודות</span>
                            <span>21/06 - 05/07</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 right-10 w-[55%] bg-indigo-400 h-full rounded-full"></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>שלד וקונסטרוקציה</span>
                            <span>06/07 - 30/08</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
                            <div className="absolute top-0 right-24 w-[30%] bg-slate-300 h-full rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeGuideTab === 'battery' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold">מעקב התקדמות כללי</span>
                    <h4 className="text-base font-bold text-slate-800">וידג׳ט סוללה (Battery Progress Widget)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      מציג תמונה מרוכזת של אחוז המשימות שהושלמו מול אלו שנמצאות בעבודה או טרם החלו, המעניק מראה מהיר על קצב התקדמות פרויקט הבנייה.
                    </p>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-700">איך להקים במאנדיי?</h5>
                      <ul className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pr-1">
                        <li>לחץ על <strong>Add View</strong> או פתח לוח מחוונים (Dashboard) נפרד.</li>
                        <li>הוסף וידג׳ט בשם <strong>Battery</strong>.</li>
                        <li>הגדר את מקור הנתונים של הוידג׳ט לעמודת הסטטוס: <strong>"סטטוס ביצוע"</strong>.</li>
                        <li>הגדר את הצבעים במאנדיי: ירוק עבור "הושלם", כחול עבור "בעבודה", אפור עבור "טרם החל", ואדום ל"מעוכב".</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-center bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/50">
                    <div className="w-full max-w-[320px] bg-white rounded-xl shadow-md p-4 space-y-3 font-sans text-right" dir="rtl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-800">מד התקדמות פרויקט - סוללה</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex h-7 rounded-lg overflow-hidden border border-slate-200">
                          <div className="w-[30%] bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold">30%</div>
                          <div className="w-[45%] bg-[#6161ff] flex items-center justify-center text-[9px] text-white font-bold">45%</div>
                          <div className="w-[15%] bg-slate-300 flex items-center justify-center text-[9px] text-slate-600 font-bold">15%</div>
                          <div className="w-[10%] bg-red-500 flex items-center justify-center text-[9px] text-white font-bold">10%</div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[9px] text-center text-slate-500 font-medium">
                          <div><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>הושלם</div>
                          <div><span className="inline-block w-2 h-2 rounded-full bg-[#6161ff] ml-1"></span>בעבודה</div>
                          <div><span className="inline-block w-2 h-2 rounded-full bg-slate-300 ml-1"></span>טרם החל</div>
                          <div><span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1"></span>מעוכב</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeGuideTab === 'budget' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold">מעקב תקציבים ועלויות</span>
                    <h4 className="text-base font-bold text-slate-800">וידג׳ט תקציב (Numbers Widgets)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      עמודות ה-Numbers בלוח הפרימיום מאפשרות סיכום אוטומטי של עלויות בפועל מול תקציב מתוכנן לכל שלב ולפרויקט כולו.
                    </p>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-700">איך להקים במאנדיי?</h5>
                      <ul className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pr-1">
                        <li>פתח את לוח הפרויקט במאנדיי.</li>
                        <li>בתחתית כל קבוצה (Group) תוכל לראות את שורת הסיכום של עמודות התקציב והעלות בפועל.</li>
                        <li>בלוח המחוונים (Dashboard), תוכל להוסיף וידג׳ט <strong>Numbers</strong>.</li>
                        <li>הגדר את הוידג׳ט שיציג את הסכום הכולל (Sum) של עמודת <strong>"תקציב מתוכנן"</strong>.</li>
                        <li>הסר וידג׳ט Numbers נוסף שיציג את הסכום של עמודת <strong>"עלות בפועל"</strong>.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-center bg-amber-50/40 p-6 rounded-2xl border border-amber-100/50">
                    <div className="w-full max-w-[320px] bg-white rounded-xl shadow-md p-4 space-y-3 font-sans text-right" dir="rtl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-800">סיכום תקציב הפרויקט</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] text-slate-400 block mb-1">סה"כ תקציב מתוכנן</span>
                          <span className="text-sm font-bold text-slate-800">205,000 ₪</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] text-slate-400 block mb-1">עלות ביצוע בפועל</span>
                          <span className="text-sm font-bold text-emerald-600">83,500 ₪</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeGuideTab === 'charts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                    <span className="inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold">תרשימי השוואה ואנליטיקה</span>
                    <h4 className="text-base font-bold text-slate-800">וידג׳ט תרשים (Chart Widget - Bar/Line)</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      מאפשר השוואה גרפית של תקציב מתוכנן מול עלות בפועל לפי קבוצות (שלבי בנייה), כדי לזהות חריגות תקציביות בזמן אמת.
                    </p>
                    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h5 className="text-xs font-bold text-slate-700">איך להקים במאנדיי?</h5>
                      <ul className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside pr-1">
                        <li>בלוח המחוונים (Dashboard), הוסף וידג׳ט מסוג <strong>Chart</strong>.</li>
                        <li>בחר בגרף מסוג <strong>Bar Chart</strong> (עמודות).</li>
                        <li>הגדר את ציר ה-X לפי <strong>"Group"</strong> (שלבי הבנייה).</li>
                        <li>בציר ה-Y (Values), בחר להציג שתי עמודות: <strong>"תקציב מתוכנן"</strong> ו-<strong>"עלות בפועל"</strong>.</li>
                        <li>שנה את סוג ההצגה ל-Stack או Split להשוואה נוחה.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-center bg-purple-50/40 p-6 rounded-2xl border border-purple-100/50">
                    <div className="w-full max-w-[320px] bg-white rounded-xl shadow-md p-4 space-y-3 font-sans text-right" dir="rtl">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[11px] font-bold text-slate-800">תקציב מתוכנן מול עלות בפועל</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                      </div>
                      <div className="h-24 flex items-end gap-3 justify-center pt-2">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1 items-end h-16">
                            <div className="w-2.5 bg-indigo-500 h-16 rounded-t"></div>
                            <div className="w-2.5 bg-emerald-500 h-6 rounded-t"></div>
                          </div>
                          <span className="text-[8px] text-slate-400">תכנון</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1 items-end h-16">
                            <div className="w-2.5 bg-indigo-500 h-12 rounded-t"></div>
                            <div className="w-2.5 bg-emerald-500 h-10 rounded-t"></div>
                          </div>
                          <span className="text-[8px] text-slate-400">תשתיות</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1 items-end h-16">
                            <div className="w-2.5 bg-indigo-500 h-14 rounded-t"></div>
                            <div className="w-2.5 bg-emerald-500 h-4 rounded-t"></div>
                          </div>
                          <span className="text-[8px] text-slate-400">שלד</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* כרטיסי סיכום KPI למשימות מאנדיי */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6"> {/* פריסת רשת ל-5 כרטיסי KPI */}
        <KpiCard  // כרטיס סה"כ משימות
          title="סה״כ משימות בלוח"  // כותרת
          value={totalTasks}  // סך הכל משימות
          icon={Layers}  // אייקון שכבות
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס משימות שהושלמו
          title="משימות שהושלמו"  // כותרת
          value={completedTasks}  // כמות מושלמת
          icon={CheckSquare}  // אייקון תיבת סימון
          status="success" // תצוגה בירוק
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס משימות בביצוע
          title="משימות בביצוע"  // כותרת
          value={inProgressTasks}  // כמות בביצוע
          icon={Clock}  // אייקון שעון
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס משימות שלא התחילו
          title="טרם החלו"  // כותרת
          value={notStartedTasks}  // כמות שטרם החלה
          icon={Calendar}  // אייקון לוח שנה
        /> {/* סיום כרטיס */}
        <KpiCard  // כרטיס משימות בעיכוב
          title="משימות בעיכוב"  // כותרת
          value={overdueTasks}  // כמות בעיכוב
          icon={AlertTriangle}  // אייקון אזהרה
          status={overdueTasks > 0 ? 'danger' : 'default'} // אדום אם יש משימות בעיכוב
        /> {/* סיום כרטיס */}
      </div> {/* סיום גריד כרטיסי KPI */}

      {/* אזור התראות מערכת מתוך מאנדיי */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"> {/* מיכל פאנל ההתראות */}
        <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת */}
          <AlertCircle className="w-4.5 h-4.5 text-red-500" /> {/* אייקון התראה אדום */}
          התראות וסיכוני ביצוע מתוך Monday.com ({alertsList.length}) {/* כותרת הדוח */}
        </h3> {/* סיום כותרת */}
        
        {alertsList.length > 0 ? ( // בדיקה אם נמצאו התראות במערכת
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* פריסת רשת לשתי עמודות של התראות */}
            {alertsList.map(alert => { // מעבר על רשימת ההתראות שנוצרה
              const IconComp = alert.icon; // שמירת רכיב האייקון למשתנה זמני
              const cardBg = alert.type === 'danger' ? 'bg-red-50/60 border-red-100 text-red-900' : alert.type === 'warning' ? 'bg-amber-50/60 border-amber-100 text-amber-900' : 'bg-blue-50/60 border-blue-100 text-blue-900'; // החלטת צבע רקע לפי חומרה
              const iconColor = alert.type === 'danger' ? 'text-red-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'; // החלטת צבע אייקון
              return ( // החזרת כרטיס התראה בודד
                <div key={alert.id} className={`border p-4 rounded-xl flex items-start gap-3 ${cardBg} transition-all hover:scale-[1.01]`}> {/* מיכל התראה מעוצב */}
                  <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} /> {/* רינדור אייקון התראה */}
                  <div className="space-y-1"> {/* תוכן ההתראה */}
                    <h5 className="font-bold text-xs">{alert.title}</h5> {/* כותרת ההתראה */}
                    <p className="text-[11px] leading-relaxed opacity-90">{alert.message}</p> {/* תוכן ההודעה המפרטת */}
                  </div> {/* סיום תוכן */}
                </div> // סיום מיכל התראה
              );
            })}
          </div> // סיום רשת ההתראות
        ) : ( // אם לא נמצאו סיכונים או עיכובים בלוח
          <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 border border-slate-200 border-dashed rounded-xl"> {/* הודעה מעודדת */}
            כל המשימות מסונכרנות ותקינות! לא נמצאו עיכובי ביצוע בלוח הזמנים הנוכחי. {/* כיתוב בעברית */}
          </div> // סיום הודעה
        )} {/* סיום תנאי */}
      </div> {/* סיום פאנל ההתראות */}

      {/* גריד גרפים אנליטיים מבוססי משימות Monday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8"> {/* פריסת רשת לשני גרפים שווים בשורה */}
        {/* גרף עוגה: התפלגות לפי סטטוסים */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[350px]"> {/* מיכל גרף 1 */}
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת */}
            <Layers className="w-4.5 h-4.5 text-[#6161ff]" /> {/* אייקון שכבות */}
            התפלגות סטטוס משימות Monday {/* שם הגרף בעברית */}
          </h3> {/* סיום כותרת */}
          <div className="flex-1 min-h-0 relative"> {/* מיכל גמיש לרכיב הגרף */}
            {pieChartData.length > 0 ? ( // בדיקה אם יש משימות
              <ResponsiveContainer width="100%" height="100%"> {/* התאמה לגודל המיכל */}
                <PieChart> {/* התחלת תרשים עוגה */}
                  <Pie // מאפייני פלחי העוגה
                    data={pieChartData} // הנתונים
                    cx="50%" // מיקום מרכז X
                    cy="50%" // מיקום מרכז Y
                    innerRadius={50} // רדיוס פנימי (דונאט)
                    outerRadius={85} // רדיוס חיצוני
                    paddingAngle={3} // מרווחים
                    dataKey="value" // המפתח לקריאת הערך
                  > {/* לולאת פלחים */}
                    {pieChartData.map((entry, index) => ( // מעבר על פלחים
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> // מילוי צבע לפי מערך מוגדר
                    ))} {/* סיום לולאה */}
                  </Pie> {/* סיום העוגה */}
                  <ChartTooltip /> {/* תיבת מידע בריחוף */}
                  <Legend  // מקרא הגרף
                    layout="vertical" // פריסה אנכית
                    align="right" // יישור לימין
                    verticalAlign="middle" // מרכוז אנכי
                    iconSize={10} // גודל סימן הצבע
                    iconType="circle" // צורה עגולה לסימן
                    formatter={(value) => <span className="text-[11px] text-slate-600 font-medium mr-2">{value}</span>} // סגנון עברי
                  /> {/* סיום המקרא */}
                </PieChart> {/* סיום תרשים העוגה */}
              </ResponsiveContainer> 
            ) : ( // אם אין משימות
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין משימות להצגה בגרף</div> // הודעה בעברית
            )} {/* סיום תנאי */}
          </div> {/* סיום מיכל גמיש */}
        </div> {/* סיום גרף 1 */}

        {/* גרף עמודות: התקדמות משימות מפתח */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[350px]"> {/* מיכל גרף 2 */}
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2"> {/* כותרת */}
            <BarChart3 className="w-4.5 h-4.5 text-emerald-500" /> {/* אייקון עמודות */}
            אחוזי התקדמות במשימות מפתח ({barChartData.length}) {/* שם הגרף בעברית */}
          </h3> {/* סיום כותרת */}
          <div className="flex-1 min-h-0"> {/* מיכל גמיש לגרף */}
            {barChartData.length > 0 ? ( // בדיקה אם יש נתוני משימות לגרף העמודות
              <ResponsiveContainer width="100%" height="100%"> {/* התאמה לגודל המיכל */}
                <BarChart data={barChartData}> {/* תרשים עמודות */}
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /> {/* קווי רשת דקים ברקע */}
                  <XAxis  // ציר ה-X - מציג את שמות המשימות
                    dataKey="name"  // מפתח שמות
                    stroke="#94a3b8"  // צבע הקו והטקסט
                    fontSize={9}  // גודל גופן קטן
                    tickLine={false} // ביטול שנתות
                  /> {/* סיום ציר X */}
                  <YAxis  // ציר ה-Y - מציג אחוזי התקדמות
                    stroke="#94a3b8"  // צבע
                    fontSize={10}  // גודל גופן
                    tickLine={false} // ביטול שנתות
                    tickFormatter={(v) => `${v}%`} // הוספת סימן אחוז ליד כל מספר
                    domain={[0, 100]} // הגבלת טווח הערכים ל-0 עד 100 אחוז
                    orientation="right" // הצגת הציר בצד ימין
                  /> {/* סיום ציר Y */}
                  <ChartTooltip /> {/* תיבת ריחוף */}
                  <Bar dataKey="התקדמות %" fill="#6161ff" name="התקדמות ביצוע" radius={[4, 4, 0, 0]} /> {/* עמודות בצבע מותג מעוגלות בקצוות */}
                </BarChart> {/* סיום תרשים העמודות */}
              </ResponsiveContainer> 
            ) : ( // אם אין משימות
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין משימות להצגה בגרף</div> // הודעה
            )} {/* סיום תנאי */}
          </div> {/* סיום מיכל גמיש */}
        </div> {/* סיום גרף 2 */}
      </div> {/* סיום גריד הגרפים */}

      {/* טבלת מעקב משימות מפורטת מסונכרנת מ-Monday.com */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col"> {/* מיכל חיצוני מעוגל לטבלה */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"> {/* חלק עליון של הטבלה */}
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"> {/* כותרת הטבלה */}
            <Calendar className="w-4.5 h-4.5 text-slate-600" /> {/* אייקון לוח שנה */}
            רשימת משימות מסונכרנות מ-Monday.com {/* שם הטבלה בעברית */}
          </h3> {/* סיום כותרת */}
          <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg"> {/* תגית מספר שורות בטבלה */}
            נמצאו {totalTasks} משימות פעילות לניהול {/* תגית בעברית */}
          </span> {/* סיום תגית */}
        </div> {/* סיום חלק עליון */}

        <div className="overflow-x-auto"> {/* פאנל גלילה אופקי למניעת חיתוך במסכים קטנים */}
          {totalTasks > 0 ? ( // בדיקה אם יש משימות בטבלה
            <table className="w-full text-right text-xs border-collapse"> {/* אלמנט הטבלה הראשי - מיושר לימין */}
              <thead> {/* כותרות העמודות בטבלה */}
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100"> {/* שורת כותרת בהירה */}
                  <th className="p-3.5 w-12 text-center">#</th> {/* מספר סידורי */}
                  <th className="p-3.5">משימה / שלב עבודה (WBS)</th> {/* שם המשימה */}
                  <th className="p-3.5 w-28 text-center">תאריך התחלה</th> {/* תאריך התחלה */}
                  <th className="p-3.5 w-28 text-center">תאריך סיום</th> {/* תאריך סיום */}
                  <th className="p-3.5 w-44">התקדמות ביצוע</th> {/* בר התקדמות ויזואלי */}
                  <th className="p-3.5 w-28 text-center">סטטוס ביצוע</th> {/* תגית סטטוס מעוצבת */}
                  <th className="p-3.5 w-36 text-center">מזהה פריט במאנדיי</th> {/* קישור לפריט ב-Monday */}
                </tr> {/* סיום שורת כותרת */}
              </thead> {/* סיום כותרות */}
              <tbody className="divide-y divide-slate-100 text-slate-700"> {/* גוף הטבלה עם קווי הפרדה עדינים */}
                {tasks.map((task, idx) => { // מעבר על משימות לרינדור שורות בטבלה
                  const isTaskOverdue = task.progress < 100 && task.end_date && task.end_date < todayStr; // בדיקה אם שורה זו בעיכוב
                  return ( // החזרת שורת נתונים בודדת
                    <tr key={task.id} className={`hover:bg-slate-50/30 transition-colors ${isTaskOverdue ? 'bg-red-50/10' : ''}`}> {/* שורה עם מעבר צבע בריחוף ורקע אדמדם עדין במקרה של עיכוב */}
                      <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td> {/* מספר סידורי של השורה */}
                      <td className="p-3.5 font-bold text-slate-800">{task.name}</td> {/* שם המשימה */}
                      <td className="p-3.5 text-center text-slate-500 font-medium"> {/* תא תאריך התחלה */}
                        {task.start_date ? new Date(task.start_date).toLocaleDateString('he-IL') : '—'} {/* עיצוב תאריך התחלה */}
                      </td> {/* סיום תא תאריך */}
                      <td className="p-3.5 text-center text-slate-500 font-medium"> {/* תא תאריך סיום */}
                        {task.end_date ? new Date(task.end_date).toLocaleDateString('he-IL') : '—'} {/* עיצוב תאריך סיום */}
                      </td> {/* סיום תא תאריך */}
                      <td className="p-3.5"> {/* תא בר התקדמות ביצוע */}
                        <div className="flex items-center gap-2.5"> {/* מיכל לבר התקדמות ואחוז מספרי */}
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200"> {/* רקע הבר */}
                            <div  // מד ההתקדמות המלא
                              className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-600' : isTaskOverdue ? 'bg-red-600' : 'bg-[#6161ff]'}`} // צבע מותאם לפי מצב (ירוק למושלם, אדום לעיכוב, סגול לביצוע רגיל)
                              style={{ width: `${task.progress}%` }} // רוחב הבר בהתאם לאחוזי ההתקדמות
                            /> {/* סיום מד */}
                          </div> {/* סיום רקע */}
                          <span className="text-[11px] font-mono font-bold text-slate-700 min-w-[32px] text-left">{task.progress}%</span> {/* אחוז מספרי */}
                        </div> {/* סיום מיכל */}
                      </td> {/* סיום תא בר */}
                      <td className="p-3.5 text-center"> {/* תא תגית סטטוס ביצוע */}
                        {task.monday_id ? ( // אם מסונכרן במאנדיי
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-bold text-[10px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            סונכרן מול Monday
                          </span>
                        ) : ( // אם לא מסונכרן
                          <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg font-bold text-[10px]">מקומי בלבד</span>
                        )}
                      </td> {/* סיום תא סטטוס */}
                      <td className="p-3.5 text-center font-mono text-slate-500 text-[10px]"> {/* תא מזהה מאנדיי */}
                        {task.monday_id ? ( // אם קיים מזהה
                          <a  // קישור חיצוני לפריט בתוך מאנדיי
                            href={`https://barsuf.monday.com/boards/${boardId}/pulses/${task.monday_id}`} // כתובת הפריט
                            target="_blank"  // פתיחה בלשונית חדשה
                            rel="noopener noreferrer" // מאפייני אבטחה
                            className="text-[#6161ff] hover:underline font-bold font-mono" // עיצוב
                          > {/* כיתוב הקישור */}
                            #{task.monday_id} {/* תצוגת המזהה */}
                          </a> // סיום קישור
                        ) : ( // אם אין מזהה
                          '—' // קו מפריד
                        )}
                      </td> {/* סיום תא מזהה */}
                    </tr> // סיום שורה
                  );
                })}
              </tbody> {/* סיום גוף הטבלה */}
            </table> // סיום הטבלה
          ) : ( // אם אין משימות מסונכרנות כלל
            <div className="p-12 text-center text-slate-400 text-xs italic bg-slate-50 border-t border-slate-100"> {/* הודעה */}
              לוח המשימות ריק. אנא לחצו על כפתור "צור לוח פרויקט חדש ב-Monday" למעלה כדי לייצא משימות. {/* הודעה בעברית */}
            </div> // סיום מיכל הודעה
          )} {/* סיום תנאי */}
        </div> {/* סיום מיכל הטבלה */}
      </div> {/* סיום אזור הטבלה */}
    </div> // סיום המעטפת
  ); // סיום ההחזרה
} // סיום הרכיב
