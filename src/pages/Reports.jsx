import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Loader2, BarChart3, Download, FileText, Filter, Users, 
  Calendar, Layers, CheckCircle, AlertTriangle, TrendingUp, DollarSign
} from 'lucide-react';
import { KpiCard } from '../components/ui/KpiCard';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

const COLORS = [
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#4f46e5', // Indigo
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#ef4444', // Red
];

// Custom Hebrew tooltips for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-md text-right text-xs" dir="rtl">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((p, idx) => (
          <p key={idx} className="font-semibold" style={{ color: p.color || p.fill }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Reports() {
  const [loading, setLoading] = useState(true);
  
  // RAW Data from Server
  const [projects, setProjects] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [contractors, setContractors] = useState([]);
  
  // Filter States
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedContractor, setSelectedContractor] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('all'); // 'all', 'monthly', 'quarterly'

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [projData, budgetData, expData, contData] = await Promise.all([
          api.getProjects(),
          api.getBudgets(),
          api.getExpenses(),
          api.getContractors()
        ]);
        
        setProjects(projData);
        setBudgets(budgetData);
        setExpenses(expData);
        setContractors(contData);
      } catch (error) {
        console.error("Failed to load reports data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-24">
        <Loader2 className="animate-spin text-[var(--color-brand)] w-10 h-10" />
      </div>
    );
  }

  // Extract unique budget categories for the filter
  const uniqueCategories = Array.from(new Set(budgets.map(b => b.category))).filter(Boolean);

  // Apply filters to Expenses
  const filteredExpenses = expenses.filter(exp => {
    // Project filter
    if (selectedProject !== 'all' && Number(exp.project_id) !== Number(selectedProject)) return false;
    // Contractor filter
    if (selectedContractor !== 'all' && Number(exp.contractor_id) !== Number(selectedContractor)) return false;
    // Category filter
    if (selectedCategory !== 'all' && exp.budget_category !== selectedCategory) return false;
    
    return true;
  });

  // Calculate filtered Budgets (only affected by selected project)
  const filteredBudgets = budgets.filter(b => {
    if (selectedProject !== 'all' && Number(b.project_id) !== Number(selectedProject)) return false;
    return true;
  });

  // KPI Calculations
  const totalBudgetVal = filteredBudgets.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalExpensesVal = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const budgetLeft = totalBudgetVal - totalExpensesVal;
  const utilizationPercent = totalBudgetVal > 0 ? (totalExpensesVal / totalBudgetVal) * 100 : 0;

  // --- CHART 1: Category Breakdown (Pie) ---
  const categoryDataMap = {};
  filteredExpenses.forEach(exp => {
    const cat = exp.budget_category || 'אחר / ללא סיווג';
    categoryDataMap[cat] = (categoryDataMap[cat] || 0) + exp.amount;
  });
  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  // --- CHART 2: Contractor Breakdown (Bar) ---
  const contractorDataMap = {};
  filteredExpenses.forEach(exp => {
    const cont = exp.contractor_name || 'קבלן עצמאי / ספק';
    contractorDataMap[cont] = (contractorDataMap[cont] || 0) + exp.amount;
  });
  const contractorChartData = Object.entries(contractorDataMap).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  // --- CHART 3: Expenses Over Time (Bar / Grouped) ---
  const timeDataMap = {};
  filteredExpenses.forEach(exp => {
    if (!exp.date) return;
    
    const year = exp.date.substring(0, 4);
    const month = exp.date.substring(5, 7);
    
    if (selectedTimePeriod === 'quarterly') {
      const mVal = parseInt(month, 10);
      let quarter = 'Q1';
      if (mVal > 9) quarter = 'רבעון 4';
      else if (mVal > 6) quarter = 'רבעון 3';
      else if (mVal > 3) quarter = 'רבעון 2';
      else quarter = 'רבעון 1';
      
      const key = `${quarter} - ${year}`;
      timeDataMap[key] = (timeDataMap[key] || 0) + exp.amount;
    } else {
      // Monthly / Default
      const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
      const mIdx = parseInt(month, 10) - 1;
      const key = `${monthNames[mIdx] || month}/${year}`;
      timeDataMap[key] = (timeDataMap[key] || 0) + exp.amount;
    }
  });

  const timeChartData = Object.entries(timeDataMap).map(([label, value]) => ({
    label,
    value
  }));

  // CSV Export Handler
  const exportToCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("אין נתונים לייצוא בטווח המסננים הנוכחי");
      return;
    }
    
    // Headers in Hebrew
    const headers = ["מזהה", "פרויקט", "תיאור ההוצאה", "סעיף תקציב", "קבלן מבצע", "תאריך", "סכום (₪)"];
    const rows = filteredExpenses.map(e => [
      e.id,
      e.project_name || "ללא פרויקט",
      e.description || "",
      e.budget_category || "אחר",
      e.contractor_name || "ספק כללי",
      e.date || "",
      e.amount
    ]);
    
    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `דוח_הוצאות_בארסוף_${new Date().toLocaleDateString('he-IL')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-right" dir="rtl">
      
      {/* כותרת הדף */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">דוחות וסטטיסטיקות</h1>
          <p className="text-slate-500 text-sm">מרכז מידע ניהולי לניתוח תקציבים והוצאות חוצי ארגון</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="flex items-center gap-2 self-start md:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          ייצוא דוח מסונן (CSV)
        </button>
      </div>

      {/* פאנל מסננים אינטראקטיבי */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-700 flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-brand)]" />
          מסנני דוחות חתך
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* פרויקט */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">בחר פרויקט</label>
            <select 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
            >
              <option value="all">כל הפרויקטים הפעילים</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* קבלן */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">בחר קבלן מבצע</label>
            <select 
              value={selectedContractor} 
              onChange={e => setSelectedContractor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
            >
              <option value="all">כל הקבלנים והספקים</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* סעיף תקציב */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">בחר סעיף תקציב</label>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
            >
              <option value="all">כל סעיפי התקציב</option>
              {uniqueCategories.map((cat, idx) => (
                <option key={idx} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* חלוקת זמן */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500">פריסת זמן בגרפים</label>
            <select 
              value={selectedTimePeriod} 
              onChange={e => setSelectedTimePeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand)] focus:bg-white transition-all"
            >
              <option value="all">חלוקה חודשית</option>
              <option value="quarterly">חלוקה רבעונית</option>
            </select>
          </div>
        </div>
      </div>

      {/* כרטיסי סיכום KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard 
          title="סה״כ תקציב מתוכנן" 
          value={formatCurrency(totalBudgetVal)} 
          icon={DollarSign} 
        />
        <KpiCard 
          title="סה״כ הוצאות בפועל" 
          value={formatCurrency(totalExpensesVal)} 
          icon={TrendingUp} 
          status={totalExpensesVal > totalBudgetVal ? 'danger' : 'default'}
        />
        <KpiCard 
          title="יתרת תקציב לביצוע" 
          value={formatCurrency(budgetLeft)} 
          icon={budgetLeft >= 0 ? CheckCircle : AlertTriangle} 
          status={budgetLeft >= 0 ? 'success' : 'danger'}
        />
        <KpiCard 
          title="אחוז ניצול תקציב" 
          value={`${utilizationPercent.toFixed(1)}%`} 
          icon={BarChart3} 
          status={utilizationPercent > 100 ? 'danger' : utilizationPercent > 80 ? 'warning' : 'default'}
        />
      </div>

      {/* אזור הגרפים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* גרף 1: התפלגות לפי סעיפים (Pie) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[400px]">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <Layers className="w-4.5 h-4.5 text-blue-500" />
            התפלגות הוצאות לפי סעיף תקציבי
          </h3>
          <div className="flex-1 min-h-0 relative">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
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
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div>
            )}
          </div>
        </div>

        {/* גרף 2: הוצאות לאורך זמן (Bar) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[400px]">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-indigo-500" />
            מגמת הוצאות לאורך זמן ({selectedTimePeriod === 'quarterly' ? 'רבעוני' : 'חודשי'})
          </h3>
          <div className="flex-1 min-h-0">
            {timeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`}
                    orientation="right"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="var(--color-brand)" name="הוצאה בפועל" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div>
            )}
          </div>
        </div>

        {/* גרף 3: הוצאות לפי קבלן (Bar - רוחב מלא) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-[380px]">
          <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-emerald-500" />
            התפלגות תשלומים לפי קבלנים וספקים
          </h3>
          <div className="flex-1 min-h-0">
            {contractorChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractorChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    type="number"
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `₪${(v/1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category"
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    orientation="right"
                    width={150}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0d9488" name='סה"כ שולם' radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400 text-xs italic">אין הוצאות תואמות להצגה</div>
            )}
          </div>
        </div>
      </div>

      {/* טבלת פירוט הוצאות מסוננת */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="w-4.5 h-4.5 text-slate-600" />
            רשימת הוצאות מפורטת
          </h3>
          <span className="text-xs text-slate-500 font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            נמצאו {filteredExpenses.length} רשומות תואמות
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredExpenses.length > 0 ? (
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th className="p-3.5">פרויקט</th>
                  <th className="p-3.5">תיאור ההוצאה</th>
                  <th className="p-3.5">קבלן מבצע</th>
                  <th className="p-3.5">סעיף תקציבי</th>
                  <th className="p-3.5 w-24 text-center">תאריך</th>
                  <th className="p-3.5 w-32 text-left">סכום</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-3.5 text-center text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-800">{exp.project_name || 'כללי'}</td>
                    <td className="p-3.5 text-slate-600 font-medium">{exp.description}</td>
                    <td className="p-3.5 text-slate-600 font-medium">{exp.contractor_name || 'ספק כללי'}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[10px]">
                        {exp.budget_category || 'כללי / אחר'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center text-slate-500 font-medium">
                      {exp.date ? new Date(exp.date).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-slate-800">
                      {exp.amount?.toLocaleString('he-IL')} ₪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs italic">לא נמצאו הוצאות התואמות למסננים שנבחרו.</div>
          )}
        </div>
      </div>
    </div>
  );
}
