import React from 'react';
import { 
  TrendingUp, Clock, Target, ShieldCheck, Zap, 
  BrainCircuit, HeartHandshake, CheckCircle2, TrendingDown,
  LineChart, Gem, ArrowUpRight
} from 'lucide-react';

export function RoiDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto text-right" dir="rtl">
      
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
          <Gem className="w-4 h-4" />
          דוח ביצועים ניהולי
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">ערך עסקי ו-ROI</h1>
        <p className="text-lg text-slate-500 mt-2 max-w-2xl">
          החזר ההשקעה והערך התפעולי מהטמעת פלטפורמת monday.com בברסוף בע"מ. 
          ניתוח נתוני יעילות, עבודה ואופטימיזציה רוחבית.
        </p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Metric 1 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-lg flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> 60% ירידה
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold mb-1">קיצור זמן הכנה</h3>
          <div className="text-3xl font-black text-slate-800">4 ימים</div>
          <p className="text-xs text-slate-400 mt-2">במקום 10 ימי עבודה להגשת מכרז</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-lg flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> 100% גידול
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold mb-1">יכולת הגשה מקבילה</h3>
          <div className="text-3xl font-black text-slate-800">4 הצעות</div>
          <p className="text-xs text-slate-400 mt-2">גידול מ-2 הצעות, ללא תוספת כוח אדם</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">
              מניעת טעויות
            </span>
          </div>
          <h3 className="text-slate-500 text-sm font-semibold mb-1">טעויות חישוב במכרז</h3>
          <div className="text-3xl font-black text-slate-800">0%</div>
          <p className="text-xs text-slate-400 mt-2">חישוב אוטומטי מונע חריגות תקציביות</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white hover:shadow-2xl hover:shadow-indigo-300 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <LineChart className="w-6 h-6 text-white" />
            </div>
          </div>
          <h3 className="text-indigo-100 text-sm font-semibold mb-1">חיסכון ושמירת רווח שנתית</h3>
          <div className="text-3xl font-black text-white">~90,000 ₪</div>
          <p className="text-xs text-indigo-100 mt-2 opacity-90">שמירת רווח ומניעת הפסדי זמנים</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content / Financial Breakdown */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 h-full bg-[var(--color-brand)]"></div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-[var(--color-brand)]" />
              תחשיב חיסכון כספי שנתי
            </h2>
            <p className="text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
              בהנחה ששעת עבודה עולה כ-150 ₪ לחברה (עלות מנהל פרויקט), והחברה מגישה כ-15-20 הצעות מחיר בשנה - החיסכון השנתי המשוער הוא:
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-[var(--color-brand)] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">חיסכון זמן עבודה</h4>
                    <p className="text-xs text-slate-500">6 שעות × 150 ₪ × 17 הצעות</p>
                  </div>
                </div>
                <div className="text-xl font-black text-emerald-600">~ 15,300 ₪</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-[var(--color-brand)] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">מניעת טעויות חישוב</h4>
                    <p className="text-xs text-slate-500">5% שגיאה בהצעה ממוצעת של 1.5M ₪</p>
                  </div>
                </div>
                <div className="text-xl font-black text-blue-600">עד 75,000 ₪</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-6">סיכום מנהלים</h2>
            <div className="prose prose-slate prose-p:leading-relaxed text-slate-600 text-sm">
              <p>
                הטמעת המערכת יצרה שינוי תהליכי עמוק - מניהול ידני מבוזר לפלטפורמה דיגיטלית, מובנית ואוטומטית. הערך שנוצר מאפשר לחברה <strong>לנהל יותר פרויקטים במקביל, לצמצם חשיפות וסיכונים כלכליים, ולבסס תשתית ארגונית התומכת בצמיחה מהירה מבלי להגדיל את מצבת כוח האדם (Scalability).</strong>
              </p>
              <p className="mt-4">
                הפלטפורמה ממזערת דרמטית את העומס הקוגניטיבי, מבטלת עבודת פקידות מיותרת, ומשחררת משאבי ניהול יקרים לטובת קידום הליבה העסקית: ניהול וביצוע פרויקטים בשטח ברמת האיכות הגבוהה ביותר.
              </p>
            </div>
          </div>

        </div>

        {/* Sidebar Values */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            ערך עסקי ותפעולי
          </h2>

          {[
            {
              icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100',
              title: "1. התייעלות תפעולית",
              desc: "חיסכון של כ-6 שעות ניהול לכל הצעת מחיר. במכפלה של 15-20 הצעות בשנה, מתקבל חיסכון מצטבר של כ-120 שעות עבודה, המופנות ישירות לפיתוח עסקי וניהול שטח."
            },
            {
              icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-100',
              title: "2. Scalability וגידול בקיבולת",
              desc: "ביטול צווארי הבקבוק בתהליך הידני איפשר את הכפלת כמות הפרויקטים המנוהלים בו-זמנית (מ-2 ל-4 מכרזים מקבילים), ללא העלאת תקורות ועלויות כוח אדם."
            },
            {
              icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100',
              title: "3. שיפור דיוק ואיכות",
              desc: "החישוב האוטומטי מבטל טעויות אנוש שהיו גורמות לחריגות תקציביות. בענף הבנייה, שגיאת חישוב של 5% מייצגת חשיפה אדירה - חיסכון שמתבטא ישירות בשורת הרווח."
            },
            {
              icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-100',
              title: "4. שימור ידע מוסדי (Data Retention)",
              desc: "תיעוד רציף ומובנה של נתוני מכרזים, כולל מחירי קבלנים והיסטוריית זכיות/הפסדים. מאגר המידע מהווה נכס ארגוני אסטרטגי לתמחור מדויק של פרויקטים עתידיים."
            },
            {
              icon: HeartHandshake, color: 'text-rose-500', bg: 'bg-rose-100',
              title: "5. מיקוד בליבה וצמצום שחיקה",
              desc: "מעבר מסביבת עבודה אדמיניסטרטיבית רוויית לחצים (חיפוש מסמכים ומרדף אחר נתונים) לניהול פרואקטיבי, המאפשר מיקוד באיכות הביצוע והגדלת רווחיות הפרויקט."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex gap-4">
                <div className={`mt-1 w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Custom icon for DollarSign since it wasn't imported at top
function DollarSign(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}
