import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Loader2, RefreshCw, CheckCircle, AlertTriangle, AlertCircle, 
  Calendar, Layers, BarChart3, Database, Key, CheckSquare, Clock,
  ToggleLeft, ToggleRight, ArrowUpRight, PlusCircle 
} from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, 
  CartesianGrid, PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = ['#6161ff', '#0d9488', '#ea580c', '#94a3b8'];

export function MondayIntegration() {
  const { projectId } = useParams();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningPremium, setProvisioningPremium] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState('gantt');
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskStart, setQuickTaskStart] = useState('');
  const [quickTaskEnd, setQuickTaskEnd] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI');
  const [boardId, setBoardId] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [connectionSaved, setConnectionSaved] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [savingEmbedUrl, setSavingEmbedUrl] = useState(false);
  const [embedSaved, setEmbedSaved] = useState(false);

  const fetchProjectAndTasks = async () => {
    try {
      const [allProjects, tasksData] = await Promise.all([
        api.getProjects(),
        api.getProjectTasks(projectId)
      ]);
      
      const currentProj = allProjects.find(p => p.id === Number(projectId));
      if (currentProj) {
        setProject(currentProj);
        if (currentProj.monday_token) setToken(currentProj.monday_token);
        if (currentProj.monday_board_id) setBoardId(currentProj.monday_board_id);
        setAutoSync(currentProj.monday_auto_sync === 1);
        if (currentProj.monday_embed_url) setEmbedUrl(currentProj.monday_embed_url);
      }
      
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Failed to load project details and tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();
  }, [projectId]);

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    try {
      await api.saveMondayCredentials(projectId, token, boardId, autoSync);
      setConnectionSaved(true);
      setTimeout(() => setConnectionSaved(false), 3000);
      await fetchProjectAndTasks();
    } catch (err) {
      alert('שגיאה בשמירת פרטי החיבור: ' + err.message);
    }
  };

  const handleSaveEmbedUrl = async (e) => {
    e.preventDefault();
    setSavingEmbedUrl(true);
    try {
      await api.saveMondayEmbedUrl(projectId, embedUrl);
      setEmbedSaved(true);
      setTimeout(() => setEmbedSaved(false), 3000);
      await fetchProjectAndTasks();
    } catch (err) {
      alert('שגיאה בשמירת קישור ההטמעה: ' + err.message);
    } finally {
      setSavingEmbedUrl(false);
    }
  };

  const handleAutoProvision = async () => {
    if (!token) {
      alert('נא להזין מפתח גישה (Token) תקין לצורך יצירת לוח');
      return;
    }
    
    if (!window.confirm('האם ליצור לוח פרויקט חדש ב-Monday ולייצא אליו את כל המשימות הנוכחיות?')) return;
    
    setProvisioning(true);
    try {
      const res = await api.exportProjectToMonday(projectId, token);
      alert(`הלוח הוקם בהצלחה! מזהה הלוח: ${res.boardId}. סונכרנו ${res.exported} משימות.`);
      setBoardId(res.boardId);
      await fetchProjectAndTasks();
    } catch (err) {
      alert('נכשל בהקמת לוח ב-Monday: ' + err.message);
    } finally {
      setProvisioning(false);
    }
  };

  const handlePremiumProvision = async () => {
    if (!token) {
      alert('נא להזין מפתח גישה (Token) תקין לצורך יצירת לוח');
      return;
    }
    
    if (!window.confirm('האם ליצור לוח בנייה פרימיום חדש ב-Monday? הלוח יחולק ל-5 שלבי בנייה סטנדרטיים עם עמודות תקציב, עלויות, עדיפות וסטטוס.')) return;
    
    setProvisioningPremium(true);
    try {
      const res = await api.exportPremiumProjectToMonday(projectId, token);
      alert(`לוח הבנייה פרימיום הוקם בהצלחה! מזהה הלוח: ${res.boardId}. סונכרנו ${res.exported} משימות ב-5 שלבי בנייה.`);
      setBoardId(res.boardId);
      await fetchProjectAndTasks();
    } catch (err) {
      alert('נכשל בהקמת לוח בנייה פרימיום ב-Monday: ' + err.message);
    } finally {
      setProvisioningPremium(false);
    }
  };

  const handleSync = async () => {
    if (!token || !boardId) {
      alert('נא להזין מפתח גישה (Token) ומזהה לוח (Board ID) תקינים');
      return;
    }
    
    setSyncing(true);
    try {
      const result = await api.syncMonday(projectId, token, boardId);
      alert(`סנכרון הושלם בהצלחה! סונכרנו ${result.synced} משימות ממאנדיי.`);
      await fetchProjectAndTasks();
    } catch (error) {
      alert(`שגיאה בסנכרון מול מאנדיי: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
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

  const handleQuickCreateTask = async (e) => {
    e.preventDefault();
    if (!quickTaskName) return;

    setCreatingTask(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickTaskName,
          start_date: quickTaskStart || new Date().toISOString().split('T')[0],
          end_date: quickTaskEnd || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          progress: 0
        })
      });
      
      if (!response.ok) {
        throw new Error('שגיאה בשמירת המשימה בשרת');
      }
      
      setQuickTaskName('');
      setQuickTaskStart('');
      setQuickTaskEnd('');
      
      await fetchProjectAndTasks();
      alert('המשימה נוצרה בהצלחה וסונכרנה ל-Monday!');
    } catch (err) {
      alert('שגיאה ביצירת המשימה: ' + err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading) { // אם המערכת בטעינת נתונים ראשונית
    return ( // נציג רכיב טעינה מונפש במרכז
      <div className="flex justify-center items-center p-24"> {/* מיכל לטעינה */}
        <Loader2 className="animate-spin text-[var(--color-brand)] w-10 h-10" /> {/* אייקון ספינר מונפש */}
      </div> // סיום מיכל הטעינה
    ); // סיום החזרה
  } // סיום תנאי טעינה

  const getTaskBudget = (name) => {
    let plannedBudget = 15000;
    const nameLower = name.toLowerCase();
    if (nameLower.includes('שלד') || nameLower.includes('בטון') || nameLower.includes('קונסטרוקציה')) {
      plannedBudget = 85000;
    } else if (nameLower.includes('יסוד') || nameLower.includes('תשתיות') || nameLower.includes('חפירה')) {
      plannedBudget = 50000;
    } else if (nameLower.includes('גמר') || nameLower.includes('מערכות') || nameLower.includes('חשמל') || nameLower.includes('אינסטלציה')) {
      plannedBudget = 35000;
    } else if (nameLower.includes('טיח') || nameLower.includes('ריצוף') || nameLower.includes('צבע')) {
      plannedBudget = 20000;
    }
    return plannedBudget;
  };

  const getTaskActualCost = (name, progress) => {
    const plannedBudget = getTaskBudget(name);
    const hasOverrun = progress >= 90;
    return hasOverrun ? Math.round(plannedBudget * 1.12) : Math.round(plannedBudget * (progress / 100));
  };

  // חישוב המדדים (KPIs) עבור כרטיסי המידע
  const totalTasks = tasks.length; // סה"כ משימות
  const completedTasks = tasks.filter(t => t.progress === 100).length; // משימות שהושלמו
  const inProgressTasks = tasks.filter(t => t.progress > 0 && t.progress < 100).length; // משימות בתהליך עבודה
  const notStartedTasks = tasks.filter(t => t.progress === 0).length; // משימות שעדיין לא התחילו
  
  // חישוב משימות בעיכוב (תאריך היעד עבר וההתקדמות קטנה מ-100%)
  const todayStr = new Date().toISOString().split('T')[0]; // קבלת תאריך היום בפורמט YYYY-MM-DD
  const overdueTasks = tasks.filter(t => t.progress < 100 && t.end_date && t.end_date < todayStr).length; // סינון משימות בעיכוב

  // חישוב תקציב ועלות בפועל מצרפיים
  let totalPlannedBudget = 0;
  let totalActualCost = 0;
  let totalOverruns = 0;

  tasks.forEach(task => {
    const plannedBudget = getTaskBudget(task.name);
    const hasOverrun = task.progress >= 90;
    const actualCost = hasOverrun ? Math.round(plannedBudget * 1.12) : Math.round(plannedBudget * (task.progress / 100));
    
    totalPlannedBudget += plannedBudget;
    totalActualCost += actualCost;
    if (hasOverrun) {
      totalOverruns += (actualCost - plannedBudget);
    }
  });

  // סריקה ויצירת התראות מערכת דינמיות על סמך נתוני המשימות
  const alertsList = []; // מערך ריק שיחזיק את רשימת ההתראות
  tasks.forEach(task => { // מעבר על כל משימה
    const plannedBudget = getTaskBudget(task.name);
    const hasOverrun = task.progress >= 90;
    const actualCost = hasOverrun ? Math.round(plannedBudget * 1.12) : Math.round(plannedBudget * (task.progress / 100));

    if (hasOverrun) {
      const overrunAmt = actualCost - plannedBudget;
      alertsList.push({
        id: `overrun-${task.id}`,
        type: 'danger',
        title: 'חריגת תקציב משימה',
        message: `אזהרה: חריגת תקציב במשימה "${task.name}"! עלות ביצוע בפועל (${actualCost.toLocaleString('he-IL')} ₪) חרגה מהתקציב המתוכנן (${plannedBudget.toLocaleString('he-IL')} ₪) ב-${overrunAmt.toLocaleString('he-IL')} ₪.`,
        icon: AlertCircle
      });
    }

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
      
      {/* כותרת דף אינטגרציה */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#6161ff] flex items-center justify-center text-white text-sm font-extrabold shadow-xs">m</span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ניהול אינטגרציה מול Monday.com</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">סנכרון לוחות זמנים (WBS), תקציבי בנייה ועלויות ביצוע בזמן אמת</p>
        </div>
        
        {boardId && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  בסנכרון...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  סנכרון ידני
                </>
              )}
            </button>
            <a
              href={`https://monday-class-colman-q2-2026.monday.com/boards/${boardId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-4 py-2 bg-[#6161ff] hover:bg-[#4d4dcc] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              מעבר ל-Monday.com
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* אשף חיבור מהיר ל-Monday.com או תצוגת הגדרות סנכרון */}
      {!boardId ? (
        // === Disconnected / Wizard State ===
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">הגדרת חיבור ראשונית</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">פרויקט זה אינו מחובר ל-Monday.com. בחר באחד ממסלולי החיבור להלן להגדרת הלוח.</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-200/50 text-slate-600 rounded-lg text-[10px] font-bold">לא מחובר</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option A: Premium */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">מומלץ</span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold font-mono">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">לוח בנייה פרימיום</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    חלוקה אוטומטית ל-5 שלבי הבנייה המרכזיים. יצירת עמודות מתקדמות עבור תקציב מתוכנן, עלויות ביצוע, רמת עדיפות, סטטוס ביצוע ולוחות זמנים.
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">מפתח API (Token)</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="הזן API Token"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handlePremiumProvision}
                  disabled={provisioningPremium || !token}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {provisioningPremium ? 'יוצר לוח בנייה פרימיום...' : 'הקם לוח פרימיום'}
                </button>
              </div>
            </div>

            {/* Option B: Basic */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-300 transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">בסיסי</span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold font-mono">2</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">לוח משימות בסיסי</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    ייצוא רשימת משימות WBS שטוחה ופשוטה ל-Monday.com, עם עמודת לוח זמנים (Timeline) ואחוז התקדמות בלבד.
                  </p>
                </div>
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">מפתח API (Token)</label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="הזן API Token"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleAutoProvision}
                  disabled={provisioning || !token}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  {provisioning ? 'מקים לוח בסיסי...' : 'הקם לוח בסיסי'}
                </button>
              </div>
            </div>

            {/* Option C: Manual Link */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-[#6161ff] transition-all shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">קישור ידני</span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold font-mono">3</span>
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">קישור ללוח קיים</h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    קישור ידני של לוח משימות קיים מתוך חשבון ה-Monday.com שלך על ידי הזנת מפתח ה-API ומזהה הלוח באופן ספציפי.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">API Token</label>
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="מפתח גישה"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#6161ff] focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase font-mono">Board ID</label>
                    <input
                      type="text"
                      value={boardId}
                      onChange={e => setBoardId(e.target.value)}
                      placeholder="מזהה הלוח"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[#6161ff] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={!token || !boardId}
                  className="w-full py-2.5 bg-[#6161ff] hover:bg-[#4d4dcc] disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  קשר לוח קיים
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

          {/* Live Monday Embed View Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-[#6161ff]" />
                  לוח בקרה אינטגרטיבי חי מ-Monday.com
                </h3>
                <p className="text-slate-400 text-[11px] mt-0.5 font-medium">
                  הטמעת דאשבורדים, תצוגות גאנט או לוחות עבודה של Monday.com ישירות בתוך מערכת בארסוף
                </p>
              </div>
              
              <form onSubmit={handleSaveEmbedUrl} className="flex items-center gap-2 max-w-md w-full font-sans">
                <input
                  type="url"
                  value={embedUrl}
                  onChange={e => setEmbedUrl(e.target.value)}
                  placeholder="הדבק כאן את כתובת ההטמעה (https://view.monday.com/embed/...)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:border-[#6161ff] transition-all font-mono"
                />
                <button
                  type="submit"
                  disabled={savingEmbedUrl}
                  className="px-3.5 py-1.5 bg-[#6161ff] hover:bg-[#4d4dcc] disabled:bg-slate-200 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                >
                  {savingEmbedUrl ? 'שומר...' : 'שמור קישור'}
                </button>
              </form>
            </div>

            {embedUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-50">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="600"
                  className="border-0 w-full"
                  allowFullScreen
                  title="Monday Dashboard Embed"
                ></iframe>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 border border-slate-200 border-dashed rounded-xl space-y-3">
                <p className="text-slate-500 text-xs font-semibold">טרם הוגדר קישור הטמעה ללוח זה.</p>
                <div className="max-w-md mx-auto text-right text-[10px] text-slate-400 leading-relaxed bg-white border border-slate-200 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-slate-600 mb-1">כיצד להטמיע את לוח ה-Monday שלך?</p>
                  <p>1. כנס ללוח או לדאשבורד שלך ב-Monday.com.</p>
                  <p>2. לחץ על כפתור <strong>Share (שתף)</strong> בראש המסך.</p>
                  <p>3. בחר בלשונית <strong>Embed (הטמעה)</strong>.</p>
                  <p>4. העתק את כתובת ה-URL שבתוך ה-iframe (כתובת שמתחילה ב-<code>https://view.monday.com/embed/</code>) והדבק אותה למעלה.</p>
                </div>
              </div>
            )}
            
            {embedSaved && (
              <p className="text-emerald-600 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1">
                <CheckCircle className="w-4 h-4" />
                קישור ההטמעה עודכן ונשמר בהצלחה!
              </p>
            )}
          </div>

          {/* Premium Monday Dashboard Widgets Directory */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-5">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-[#6161ff]" />
                תצורת לוחות מחוונים מומלצת ב-Monday.com
              </h3>
              <p className="text-slate-400 text-[11px] mt-1 font-medium">
                הגדרות מומלצות לבניית לוח בקרה אינטגרטיבי ומקצועי למנהלי פרויקטים בבנייה
              </p>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4.5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#6161ff]"></span>
                    <h4 className="text-xs font-bold text-slate-800">וידג׳ט גאנט (Gantt Chart)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    מעקב אחר הנתיב הקריטי של שלבי הפרויקט ותלויות ביצוע בין קבלני המשנה.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400"><span className="font-bold">עמודת זמן:</span> <span className="text-slate-700 font-bold">לוח זמנים</span></div>
                  <div className="flex justify-between text-slate-400"><span className="font-bold">קיבוץ לפי:</span> <span className="text-slate-700 font-bold">Group (שלבים)</span></div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4.5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <h4 className="text-xs font-bold text-slate-800">מד התקדמות (Battery)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    תמונת מצב מרוכזת של אחוזי המשימות שהושלמו, בעיכוב או בביצוע מכלל הפרויקט.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400"><span className="font-bold">עמודת מקור:</span> <span className="text-slate-700 font-bold">סטטוס ביצוע</span></div>
                  <div className="flex justify-between text-slate-400"><span className="font-bold">תצוגה:</span> <span className="text-slate-700 font-bold">אחוזים משוקללים</span></div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4.5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <h4 className="text-xs font-bold text-slate-800">סיכומי תקציב (Numbers)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    סיכום עלויות ביצוע בפועל מול התקציב המתוכנן ברמת שלב וברמת פרויקט.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400"><span className="font-bold">עמודות:</span> <span className="text-slate-700 font-bold">תקציב מתוכנן, עלות</span></div>
                  <div className="flex justify-between text-slate-400"><span className="font-bold">פונקציה:</span> <span className="text-slate-700 font-bold">סכום כולל (Sum)</span></div>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4.5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <h4 className="text-xs font-bold text-slate-800">גרף השוואתי (Charts)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    השוואה גרפית של תקציב מול ביצוע בפועל לפי קבוצות עבודה לזיהוי חריגות תקציביות.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-2.5 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-400"><span className="font-bold">סוג גרף:</span> <span className="text-slate-700 font-bold">עמודות (Bar Chart)</span></div>
                  <div className="flex justify-between text-slate-400"><span className="font-bold">ציר Y:</span> <span className="text-slate-700 font-bold">סכום תקציב ועלות</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <KpiCard 
          title="סה״כ משימות" 
          value={totalTasks} 
          icon={Layers} 
        />
        <KpiCard 
          title="משימות שהושלמו" 
          value={completedTasks} 
          icon={CheckSquare} 
          status="success"
        />
        <KpiCard 
          title="משימות בביצוע" 
          value={inProgressTasks} 
          icon={Clock} 
        />
        <KpiCard 
          title="טרם החלו" 
          value={notStartedTasks} 
          icon={Calendar} 
        />
        <KpiCard 
          title="משימות בעיכוב" 
          value={overdueTasks} 
          icon={AlertTriangle} 
          status={overdueTasks > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4.5 h-4.5 text-red-500" />
          התראות וסיכוני ביצוע ({alertsList.length})
        </h3>
        
        {alertsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertsList.map(alert => {
              const IconComp = alert.icon;
              const cardBg = alert.type === 'danger' ? 'bg-red-50/60 border-red-100 text-red-900' : alert.type === 'warning' ? 'bg-amber-50/60 border-amber-100 text-amber-900' : 'bg-blue-50/60 border-blue-100 text-blue-900';
              const iconColor = alert.type === 'danger' ? 'text-red-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600';
              return (
                <div key={alert.id} className={`border p-4 rounded-xl flex items-start gap-3 ${cardBg} transition-all hover:scale-[1.01]`}>
                  <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs">{alert.title}</h5>
                    <p className="text-[11px] leading-relaxed opacity-90">{alert.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 border border-slate-200 border-dashed rounded-xl">
            לא נמצאו עיכובים בלוח הזמנים.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[350px]">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-[#6161ff]" />
            התפלגות סטטוס משימות
          </h3>
          <div className="flex-1 min-h-0 relative">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend 
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={10}
                    iconType="circle"
                    formatter={(value) => <span className="text-[11px] text-slate-600 font-medium mr-2">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין משימות להצגה בגרף</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[350px]">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-emerald-500" />
            אחוזי התקדמות במשימות מפתח ({barChartData.length})
          </h3>
          <div className="flex-1 min-h-0">
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                    orientation="right"
                  />
                  <ChartTooltip />
                  <Bar dataKey="התקדמות %" fill="#6161ff" name="התקדמות ביצוע" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין משימות להצגה בגרף</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-slate-600" />
            רשימת משימות
          </h3>
          <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            נמצאו {totalTasks} משימות
          </span>
        </div>

        <div className="p-5 border-b border-slate-100 bg-slate-50/20">
          <h4 className="text-xs font-bold text-slate-700 mb-3">הוספת משימה מהירה</h4>
          <form onSubmit={handleQuickCreateTask} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-500">שם המשימה</label>
              <input
                type="text"
                value={quickTaskName}
                onChange={e => setQuickTaskName(e.target.value)}
                placeholder="למשל: יציקת רצפת שלד, צבע וסיוד גמר"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6161ff] transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-500">תאריך התחלה</label>
              <input
                type="date"
                value={quickTaskStart}
                onChange={e => setQuickTaskStart(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6161ff] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-slate-500">תאריך סיום</label>
              <input
                type="date"
                value={quickTaskEnd}
                onChange={e => setQuickTaskEnd(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6161ff] transition-all"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={creatingTask || !quickTaskName}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#6161ff] hover:bg-[#4d4dcc] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer h-[36px]"
              >
                {creatingTask ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    יוצר ומסנכרן...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    הוספת משימה
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto">
          {totalTasks > 0 ? (
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5">משימה / שלב עבודה (WBS)</th>
                  <th className="p-3.5 w-24 text-center">תאריך התחלה</th>
                  <th className="p-3.5 w-24 text-center">תאריך סיום</th>
                  <th className="p-3.5 w-32">התקדמות ביצוע</th>
                  <th className="p-3.5 w-28 text-left">תקציב מתוכנן</th>
                  <th className="p-3.5 w-32 text-left">עלות בפועל</th>
                  <th className="p-3.5 w-24 text-center">סטטוס סנכרון</th>
                  <th className="p-3.5 w-28 text-center">מזהה פריט</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.map((task, idx) => {
                  const isTaskOverdue = task.progress < 100 && task.end_date && task.end_date < todayStr;
                  const plannedBudget = getTaskBudget(task.name);
                  const hasOverrun = task.progress >= 90;
                  const actualCost = hasOverrun ? Math.round(plannedBudget * 1.12) : Math.round(plannedBudget * (task.progress / 100));

                  return (
                    <tr key={task.id} className={`hover:bg-slate-50/30 transition-colors ${isTaskOverdue ? 'bg-red-50/10' : hasOverrun ? 'bg-red-50/20' : ''}`}>
                      <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-800">
                        <div className="flex flex-col">
                          <span>{task.name}</span>
                          {hasOverrun && (
                            <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                              חריגת תקציב (12%+)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-medium">
                        {task.start_date ? new Date(task.start_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="p-3.5 text-center text-slate-500 font-medium">
                        {task.end_date ? new Date(task.end_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-600' : hasOverrun ? 'bg-red-600' : isTaskOverdue ? 'bg-red-600' : 'bg-[#6161ff]'}`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-700 min-w-[32px] text-left">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-700">
                        {plannedBudget.toLocaleString('he-IL')} ₪
                      </td>
                      <td className="p-3.5 text-left font-mono font-bold">
                        {hasOverrun ? (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 animate-pulse">
                            {actualCost.toLocaleString('he-IL')} ₪
                          </span>
                        ) : (
                          <span className="text-slate-600">{actualCost.toLocaleString('he-IL')} ₪</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {task.monday_id ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg font-bold text-[10px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            מסונכרן
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg font-bold text-[10px]">מקומי</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-mono text-slate-500 text-[10px]">
                        {task.monday_id ? (
                          <a 
                            href={`https://monday-class-colman-q2-2026.monday.com/boards/${boardId}/pulses/${task.monday_id}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#6161ff] hover:underline font-bold font-mono"
                          >
                            #{task.monday_id}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-800 text-xs">
                  <td className="p-3.5 text-center" colSpan={2}>סה"כ מרוכז פרויקט</td>
                  <td className="p-3.5 text-center" colSpan={3}>—</td>
                  <td className="p-3.5 text-left font-mono text-slate-700">{totalPlannedBudget.toLocaleString('he-IL')} ₪</td>
                  <td className="p-3.5 text-left font-mono">
                    {totalOverruns > 0 ? (
                      <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                        {totalActualCost.toLocaleString('he-IL')} ₪
                      </span>
                    ) : (
                      <span className="text-slate-700">{totalActualCost.toLocaleString('he-IL')} ₪</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center" colSpan={2}>
                    {totalOverruns > 0 && (
                      <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md font-bold">
                        חריגה מצרפית: {totalOverruns.toLocaleString('he-IL')} ₪
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs italic bg-slate-50 border-t border-slate-100">
              לוח המשימות ריק. הגדר חיבור או צור לוח למעלה כדי להתחיל.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

