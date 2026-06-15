import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const financialData = [
  { month: 'ינו׳', 'חיסכון מצטבר': 7500, 'עלות המערכת': 1200 },
  { month: 'פבר׳', 'חיסכון מצטבר': 15000, 'עלות המערכת': 2400 },
  { month: 'מרץ', 'חיסכון מצטבר': 23000, 'עלות המערכת': 3600 },
  { month: 'אפר׳', 'חיסכון מצטבר': 31000, 'עלות המערכת': 4800 },
  { month: 'מאי', 'חיסכון מצטבר': 38500, 'עלות המערכת': 6000 },
  { month: 'יונ׳', 'חיסכון מצטבר': 46000, 'עלות המערכת': 7200 },
  { month: 'יול׳', 'חיסכון מצטבר': 54000, 'עלות המערכת': 8400 },
  { month: 'אוג׳', 'חיסכון מצטבר': 61500, 'עלות המערכת': 9600 },
  { month: 'ספט׳', 'חיסכון מצטבר': 69000, 'עלות המערכת': 10800 },
  { month: 'אוק׳', 'חיסכון מצטבר': 76500, 'עלות המערכת': 12000 },
  { month: 'נוב׳', 'חיסכון מצטבר': 84000, 'עלות המערכת': 13200 },
  { month: 'דצמ׳', 'חיסכון מצטבר': 91500, 'עלות המערכת': 14400 },
];

const timeData = [
  { phase: 'איסוף נתונים', 'ידני': 24, 'אוטומטי': 4 },
  { phase: 'חישובי כמויות', 'ידני': 32, 'אוטומטי': 8 },
  { phase: 'הפקת הצעת מחיר', 'ידני': 16, 'אוטומטי': 2 },
  { phase: 'מעקב וניהול פנימי', 'ידני': 18, 'אוטומטי': 3 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-2xl border border-slate-700 backdrop-blur-md" dir="rtl">
        <p className="text-slate-300 text-xs mb-2 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-1">
            <span className="text-sm font-light text-slate-400">{entry.name}</span>
            <span className="text-sm font-bold">{entry.value.toLocaleString()} ₪</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function RoiDashboard() {
  return (
    <div className="p-10 max-w-[1400px] mx-auto text-right bg-[#FAFAFA] min-h-full" dir="rtl">
      
      {/* Executive Header */}
      <div className="mb-14 border-b border-slate-200 pb-10">
        <div className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">Executive Dashboard</div>
        <h1 className="text-5xl font-light text-slate-900 tracking-tight mb-4">החזר השקעה (ROI)</h1>
        <p className="text-xl text-slate-500 font-light max-w-3xl leading-relaxed">
          ניתוח כלכלי ותפעולי להטמעת פלטפורמת monday.com בברסוף בע"מ. הדוח מציג מדדי ביצוע מרכזיים (KPIs) ואת ההשפעה הישירה על שורת הרווח.
        </p>
      </div>

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden mb-16 shadow-sm">
        
        <div className="bg-white p-8">
          <div className="text-sm font-medium text-slate-500 mb-4">זמן עבודה להגשת מכרז</div>
          <div className="text-4xl font-light text-slate-900 mb-4">4 <span className="text-2xl text-slate-400">ימים</span></div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <ArrowDownRight className="w-4 h-4" />
            <span>60% התייעלות בזמנים</span>
          </div>
        </div>

        <div className="bg-white p-8">
          <div className="text-sm font-medium text-slate-500 mb-4">קיבולת פרויקטים מקבילים</div>
          <div className="text-4xl font-light text-slate-900 mb-4">4 <span className="text-2xl text-slate-400">הצעות</span></div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>100% גידול בתפוקה</span>
          </div>
        </div>

        <div className="bg-white p-8">
          <div className="text-sm font-medium text-slate-500 mb-4">חשיפה לטעויות חישוב</div>
          <div className="text-4xl font-light text-slate-900 mb-4">0%</div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
            <ArrowDownRight className="w-4 h-4" />
            <span>אפס חריגות תקציב מחישובים</span>
          </div>
        </div>

        <div className="bg-white p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
          <div className="text-sm font-medium text-slate-500 mb-4">חיסכון מצטבר מוערך בשנה</div>
          <div className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">₪91K</div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
            <span>ROI פוטנציאלי של מעל 600%</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        
        {/* Financial Area Chart */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-slate-800">החזר השקעה מצטבר (YTD)</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">2026 Forecast</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `₪${value/1000}k`} dx={10}/>
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="חיסכון מצטבר" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
                <Area type="step" dataKey="עלות המערכת" stroke="#94a3b8" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-900"></div>
              <span>חיסכון מצטבר</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-dashed"></div>
              <span>עלות רישוי המערכת</span>
            </div>
          </div>
        </div>

        {/* Operational Bar Chart */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-semibold text-slate-800">התייעלות זמנים לפי שלב ניהולי</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">שעות עבודה (ממוצע)</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="phase" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={10} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '14px', color: '#64748b'}} />
                <Bar dataKey="ידני" name="לפני המערכת (שעות)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="אוטומטי" name="אחרי המערכת (שעות)" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Strategic Summary */}
      <div className="bg-slate-900 text-white rounded-3xl p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-4xl relative z-10">
          <h2 className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-6">Strategic Summary</h2>
          <p className="text-2xl md:text-3xl font-light leading-relaxed mb-8">
            "הטמעת המערכת יצרה שינוי תהליכי עמוק - מניהול מבוזר לפלטפורמה דיגיטלית מובנית. 
            הערך מאפשר לברסוף בע"מ לנהל יותר פרויקטים במקביל, לצמצם חשיפות כלכליות, ולבסס תשתית התומכת בצמיחה מהירה מבלי להגדיל את מצבת כוח האדם."
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-800">
            <div>
              <div className="text-slate-400 text-sm mb-1">Scalability</div>
              <div className="font-medium text-lg">הכפלת קיבולת הביצוע</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Data Retention</div>
              <div className="font-medium text-lg">שימור ידע מוסדי קריטי</div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Resource Allocation</div>
              <div className="font-medium text-lg">מיקוד ההנהלה בליבת הביצוע</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
