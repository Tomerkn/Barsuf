import React from 'react';
import { 
  GraduationCap, BookOpen, UserCheck, 
  Settings, Database, Server, Workflow,
  Cpu, LayoutTemplate, Share2
} from 'lucide-react';

export function AcademicProject() {
  return (
    <div className="p-8 max-w-5xl mx-auto text-right" dir="rtl">
      
      {/* Cover Page Card */}
      <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 relative overflow-hidden mb-12">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-[100px] -z-10 opacity-70"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-tr-[100px] -z-10 opacity-70"></div>

        <div className="flex flex-col items-center text-center space-y-10">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-100 text-indigo-700 rounded-full mb-2">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">המסלול האקדמי - המכללה למינהל</h2>
            <h1 className="text-4xl font-extrabold text-blue-600">פרויקט גמר: יישום מערכות לניהול הארגון</h1>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-700">חברת ברסוף בע״מ</h3>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 inline-block">
              <img 
                src="https://barsuf.co.il/wp-content/uploads/2019/07/logo-barsuf.png" 
                alt="לוגו ברסוף" 
                className="h-20 object-contain mx-auto"
              />
            </div>
          </div>

          {/* Details */}
          <div className="pt-8 border-t border-slate-100 w-full max-w-md space-y-6">
            <div className="flex items-center justify-center gap-3">
              <UserCheck className="w-6 h-6 text-emerald-600" />
              <div className="text-lg">
                <span className="font-semibold text-slate-600">מגישים: </span>
                <span className="font-bold text-slate-800">בר אזולאי | תומר קנובלר</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <div className="text-lg">
                <span className="font-semibold text-slate-600">מרצה: </span>
                <span className="font-bold text-slate-800">שני בנד</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Architecture Section to impress the lecturer */}
      <h2 className="text-3xl font-extrabold text-slate-800 mb-8 flex items-center gap-3">
        <Workflow className="w-8 h-8 text-[var(--color-brand)]" />
        ארכיטקטורת המערכת והיישום
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Frontend - ממשק משתמש</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            אפליקציית דף יחיד (SPA) המפותחת ב-<strong>React.js</strong> בשילוב TailwindCSS לעיצוב רספונסיבי מודרני, ומאפשרת ניהול פרויקטים ומכרזים מנקודה אחת.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">אינטגרציית Monday.com</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            סנכרון דו-כיווני (Bidirectional) מלא מול פלטפורמת מאנדיי באמצעות API ו-Webhooks. כל פרויקט באפליקציה פותח אוטומטית לוח עבודה מובנה במאנדיי.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">בינה מלאכותית (AI)</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            שילוב מנוע <strong>Google Gemini Pro</strong> מבוסס RAG (Retrieval-Augmented Generation) לניתוח אוטומטי של מכרזי בנייה והפקת כתבי כמויות והצעות מחיר.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-4">
            <Server className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">Backend Services</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            שרת <strong>Node.js</strong> המנהל מסד נתונים פנימי (SQLite), מאזין לאירועים ממאנדיי ומריץ משימות מתוזמנות (Cron Jobs) לשליחת התראות אוטומטיות.
          </p>
        </div>

      </div>
    </div>
  );
}
