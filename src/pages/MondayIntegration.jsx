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
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickTaskStart, setQuickTaskStart] = useState('');
  const [quickTaskEnd, setQuickTaskEnd] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  
  const [token, setToken] = useState('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2ODM4MDUyOCwiYWFpIjoxMSwidWlkIjoxMDMzMjkyNzQsImlhZCI6IjIwMjYtMDYtMDhUMTg6MTQ6MDIuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjM1MDE1MDc4LCJyZ24iOiJldWMxIn0.MwVqTuydRsvQqwg02Gt4vc6yr5SkHwwgBQXP4735wNE');
  const [boardId, setBoardId] = useState('5098147203');

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
    <div className="p-8 max-w-[96%] mx-auto space-y-8 text-right" dir="rtl">
      
      {/* כותרת דף אינטגרציה */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#6161ff] flex items-center justify-center text-white text-sm font-extrabold shadow-xs">m</span>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">ניהול אינטגרציה מול Monday.com</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              מחובר ומסונכרן (ID: {boardId})
            </span>
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

