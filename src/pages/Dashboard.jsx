import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { useParams } from 'react-router-dom'; // כלי לקבלת מספר הפרויקט מהכתובת בדפדפן
import { KpiCard } from '../components/ui/KpiCard'; // כרטיסי מידע עם מספרים גדולים
import { ProgressBar } from '../components/ui/ProgressBar'; // פסי התקדמות
import { Wallet, TrendingUp, AlertTriangle, Percent, Loader2, FileSearch, Search, BrainCircuit, ClipboardList } from 'lucide-react'; // אייקונים
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'; // כלים לציור גרפים
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { AIFloatingWidget } from '../components/ui/AIFloatingWidget'; // הבוט הצף (ברבור)

const formatCurrency = (value) => { // פונקציה שהופכת מספר לסכום כספי בשקלים
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

const renderStyledTable = (table, key) => {
  return (
    <div key={`table-${key}`} className="my-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-right border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            {table.headers.map((header, idx) => (
              <th key={idx} className="p-3 font-semibold text-slate-800 border-l border-slate-100 last:border-l-0">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {table.rows.map((row, rowIdx) => {
            const isGroupHeader = row.filter(c => c !== '').length <= 2;
            return (
              <tr 
                key={rowIdx} 
                className={`hover:bg-slate-50/50 transition-colors ${isGroupHeader ? 'bg-slate-50/30' : ''}`}
              >
                {row.map((cell, cellIdx) => (
                  <td 
                    key={cellIdx} 
                    className={`p-3 text-slate-700 border-l border-slate-100 last:border-l-0 ${isGroupHeader ? 'font-bold' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const renderCleanContentWithTables = (text) => {
  if (!text) return null;
  
  const cleaned = text
    .replace(/\[CONFIDENCE\].*?\[\/CONFIDENCE\]/gs, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/\*/g, '')
    .trim();
    
  const lines = cleaned.split('\n');
  const elements = [];
  let currentTable = null;
  let textBuffer = [];
  
  const flushTextBuffer = (key) => {
    if (textBuffer.length > 0) {
      elements.push(
        <div key={`text-${key}`} className="whitespace-pre-wrap leading-relaxed text-sm text-slate-600 text-right">
          {textBuffer.join('\n')}
        </div>
      );
      textBuffer = [];
    }
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isRow = line.startsWith('|') && line.endsWith('|') && line.split('|').length > 2;
    const isHeading = line.startsWith('#');
    
    if (isRow || isHeading) {
      flushTextBuffer(i);
      
      if (isRow) {
        const isSeparator = line.replace(/[:-\s|]/g, '') === '';
        if (isSeparator) {
          continue;
        }
        
        const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
      } else if (isHeading) {
        if (currentTable) {
          elements.push(renderStyledTable(currentTable, i));
          currentTable = null;
        }
        
        const match = line.match(/^(#+)\s*(.*)$/);
        if (match) {
          const level = match[1].length;
          const headingText = match[2];
          const headingClasses = 
            level === 1 ? "text-xl font-extrabold text-slate-800 mt-6 mb-3 border-b border-slate-100 pb-1" :
            level === 2 ? "text-lg font-bold text-slate-800 mt-5 mb-2" :
            "text-base font-bold text-slate-800 mt-4 mb-2";
          
          elements.push(
            <div key={`heading-${i}`} className={`${headingClasses} text-right`}>
              {headingText}
            </div>
          );
        }
      }
    } else {
      if (currentTable) {
        elements.push(renderStyledTable(currentTable, i));
        currentTable = null;
      }
      textBuffer.push(lines[i]);
    }
  }
  
  flushTextBuffer(lines.length);
  
  if (currentTable) {
    elements.push(renderStyledTable(currentTable, lines.length));
  }
  
  return <div className="space-y-4">{elements}</div>;
};

const splitProposal = (proposalText) => {
  if (!proposalText) return { before: null, after: null };
  const splitRegex = /(?:\n|^)(?:###\s*4\.|4\.\s*פרטי\s*המציע|\*\*4\.)/i;
  const match = proposalText.match(splitRegex);
  if (match) {
    const index = match.index;
    return {
      before: proposalText.substring(0, index).trim(),
      after: proposalText.substring(index).trim()
    };
  }
  const signatureRegex = /(?:\n|^)(?:###\s*חתימה|\*\*חתימה|פרטי\s*המציע|שם\s*המציע\s*:\s*ברסוף)/i;
  const sigMatch = proposalText.match(signatureRegex);
  if (sigMatch) {
    const index = sigMatch.index;
    return {
      before: proposalText.substring(0, index).trim(),
      after: proposalText.substring(index).trim()
    };
  }
  return { before: proposalText, after: null };
};

export function Dashboard() { // דף הלוח בקרה (דשבורד) של הפרויקט
  const { projectId } = useParams(); // לוקחים את מספר הפרויקט מהכתובת
  const [data, setData] = useState(null); // כאן נשמור את כל הנתונים שנביא מהשרת
  const [loading, setLoading] = useState(true); // האם אנחנו עדיין מחכים לנתונים

  useEffect(() => { // ברגע שהדף עולה או שמספר הפרויקט משתנה - מביאים נתונים
    if (!projectId) return;
    
    const fetchAnalytics = async () => { // פונקציה שמביאה את הניתוח הכספי
      setLoading(true);
      try {
        const analytics = await api.getProjectAnalytics(projectId); // מבקשים מהשרת את הנתונים
        setData(analytics); // שומרים אותם במערכת
      } catch (error) {
        console.error('Error fetching dashboard data:', error); // אם הייתה תקלה
      } finally {
        setLoading(false); // מפסיקים להראות טעינה
      }
    };
    fetchAnalytics();
  }, [projectId]);

  if (loading) { // אם אנחנו בטעינה, מראים סמל מסתובב
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (!data || !data.project) return <div className="p-8 text-center text-red-500 font-bold">שגיאה בטעינת נתונים או פרויקט לא נמצא.</div>;
  
  // הגדרת ערכי ברירת מחדל כדי למנוע קריסה
  const { 
    project, 
    totalBudget = 0, 
    actualExecution = 0, 
    totalIncomes = 0, 
    profitLoss = 0, 
    variance = 0, 
    utilization = 0, 
    breakdown = [] 
  } = data;

  const isOverspent = variance > 0; // בודקים אם חרגנו מהתקציב
  const statusColor = isOverspent ? 'bg-red-500' : 'bg-[#10b981]'; // צבע הסטטוס (אדום לחריגה, ירוק לתקין)
  const statusText = isOverspent ? 'חריגה תקציבית' : 'תקין';

  const chartData = Array.isArray(breakdown) ? breakdown.map(item => ({ // מכינים את הנתונים לגרף העמודות
    name: item.category || 'כללי', // שם הסעיף (למשל: חשמל)
    תקציב: item.budget || 0, // הסכום המתוכנן
    ביצוע: item.actual || 0 // הסכום ששולם בפועל
  })) : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* כותרת הדף עם שם הפרויקט והסטטוס שלו */}
      <div className="mb-8 flex justify-between items-end bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2 flex items-center gap-3">
            {project.name}
          </h1>
          <p className="text-text-secondary text-sm">{project.location} • צפי סיום: {new Date(project.end_date).toLocaleDateString('he-IL')}</p>
        </div>
        <div className="bg-surface-hover border border-border px-4 py-2 rounded-lg text-sm font-medium text-text-primary flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}></div>
          סטטוס נוכחי: {statusText}
        </div>
      </div>

      {/* כרטיסי מידע עליונים עם מספרים מרכזיים */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="תקציב כולל" 
          value={formatCurrency(totalBudget)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="סה״כ הוצאות (ביצוע)" 
          value={formatCurrency(actualExecution)} 
          icon={TrendingUp} 
        />
        <KpiCard 
          title="סה״כ הכנסות" 
          value={formatCurrency(totalIncomes)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="רווח והפסד (P&L)" 
          value={formatCurrency(Math.abs(profitLoss))} 
          subtext={profitLoss >= 0 ? 'רווח' : 'הפסד'}
          status={profitLoss >= 0 ? 'ok' : 'danger'}
          icon={AlertTriangle} 
        />
      </div>
      
      {/* כרטיס אחוז ניצול התקציב */}
      <div className="mb-8">
        <KpiCard 
            title="אחוז ניצול תקציב" 
            value={`${utilization.toFixed(1)}%`} 
            status={utilization > 100 ? 'danger' : utilization > 90 ? 'warning' : 'ok'}
            icon={Percent} 
          />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* רשימת פסי התקדמות לפי סעיפי תקציב */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col gap-4 overflow-y-auto max-h-[400px]">
          <h3 className="text-lg font-bold text-text-primary sticky top-0 bg-surface pb-2 z-10">התקדמות לפי סעיפים</h3>
          {breakdown.map(item => (
            <ProgressBar 
              key={item.id} 
              label={item.category} 
              value={item.actual || 0} 
              max={item.budget} 
              formatValue={(val) => `₪${(val/1000).toFixed(0)}k`}
            />
          ))}
        </div>

        {/* גרף השוואה בין תקציב לביצוע */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-text-primary mb-6">תקציב מול ביצוע לפי סעיף</h3>
          <div className="h-[300px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', textAlign: 'right', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#475569' }}
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#64748b', marginBottom: '0.5rem', display: 'block' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="תקציב" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="ביצוע" fill="#57B9C1" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* אזור ניתוח מכרז מקורי (אם קיים) */}
      {project.analysis && (
        <div className="mt-8 bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-border">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-[var(--color-brand)]" />
              ניתוח מכרז ומקורות פרויקט
            </h3>
            {project.tender_id && (
              <span className="text-xs text-text-muted bg-slate-100 px-2.5 py-1 rounded-lg">
                הועבר ממכרז חכם (מזהה מכרז: {project.tender_id})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* צד ימין: ניתוח המכרז */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-text-secondary flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-500" />
                ניתוח מכרז חכם (ברבור)
              </h4>
              <div className="bg-blue-50/20 p-5 rounded-xl border border-blue-50 text-sm leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                {project.analysis.includes('[CONFIDENCE]') && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2 text-blue-700">
                      <BrainCircuit className="w-4 h-4 text-blue-600 animate-pulse" />
                      <span className="font-bold text-[11px]">מדד וודאות ניתוח:</span>
                    </div>
                    {(() => {
                      const conf = parseInt(project.analysis.match(/\[CONFIDENCE\](\d+)\[\/CONFIDENCE\]/)?.[1] || '0');
                      const color = conf > 80 ? 'text-emerald-600 font-extrabold' : conf > 50 ? 'text-amber-600 font-extrabold' : 'text-red-600 font-extrabold';
                      return <span className={`text-lg ${color}`}>{conf}%</span>;
                    })()}
                  </div>
                )}
                <div>{renderCleanContentWithTables(project.analysis)}</div>
              </div>
            </div>

            {/* צד שמאל: הצעת המחיר מבוססת ההיסטוריה */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-text-secondary flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                אומדן והצעת מחיר היסטורית
              </h4>
              <div className="bg-emerald-50/20 p-5 rounded-xl border border-emerald-50 text-sm leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                {project.proposal ? (
                  <>
                    {project.proposal.includes('[CONFIDENCE]') && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-lg flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2 text-emerald-700">
                          <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
                          <span className="font-bold text-[11px]">מדד וודאות אומדן:</span>
                        </div>
                        {(() => {
                          const conf = parseInt(project.proposal.match(/\[CONFIDENCE\](\d+)\[\/CONFIDENCE\]/)?.[1] || '0');
                          const color = conf > 80 ? 'text-emerald-600 font-extrabold' : conf > 50 ? 'text-amber-600 font-extrabold' : 'text-red-600 font-extrabold';
                          return <span className={`text-lg ${color}`}>{conf}%</span>;
                        })()}
                      </div>
                    )}
                    {(() => {
                      const { before, after } = splitProposal(project.proposal);
                      return (
                        <>
                          {before && <div>{renderCleanContentWithTables(before)}</div>}
                          
                          {project.boq_json && (
                            <div className="mt-6 border-t border-emerald-100 pt-4">
                              <h5 className="font-bold text-xs text-emerald-800 mb-3 flex items-center gap-1.5">
                                <ClipboardList className="w-4.5 h-4.5" />
                                כתב כמויות מפורט (BOQ) ואומדן עלויות
                              </h5>
                              <div className="overflow-x-auto rounded-lg border border-emerald-100 shadow-sm bg-white">
                                <table className="w-full text-right text-[11px] border-collapse">
                                  <thead>
                                    <tr className="bg-emerald-50/50 text-emerald-800 font-bold border-b border-emerald-100">
                                      <th className="p-2 w-8 text-center">#</th>
                                      <th className="p-2 w-20">סעיף</th>
                                      <th className="p-2">תיאור העבודה</th>
                                      <th className="p-2 w-16 text-center">כמות</th>
                                      <th className="p-2 w-16 text-center">יחידה</th>
                                      <th className="p-2 w-24 text-left">מחיר יחידה</th>
                                      <th className="p-2 w-24 text-left">סה"כ (₪)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-emerald-50 text-slate-700">
                                    {(() => {
                                      try {
                                        const boq = JSON.parse(project.boq_json);
                                        if (!Array.isArray(boq)) return null;
                                        let totalSum = 0;
                                        return (
                                          <>
                                            {boq.map((item, idx) => {
                                              const qty = Number(item.quantity) || 0;
                                              const price = Number(item.unitPrice || item.price || 0);
                                              const lineTotal = qty * price;
                                              totalSum += lineTotal;
                                              return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                  <td className="p-2 text-center text-slate-400 font-medium">{idx + 1}</td>
                                                  <td className="p-2 font-semibold text-slate-800">{item.section}</td>
                                                  <td className="p-2 text-slate-600">{item.item || item.description}</td>
                                                  <td className="p-2 text-center">{qty.toLocaleString('he-IL')}</td>
                                                  <td className="p-2 text-center">{item.unit || 'יח\''}</td>
                                                  <td className="p-2 text-left font-mono">{price.toLocaleString('he-IL')} ₪</td>
                                                  <td className="p-2 text-left font-bold text-slate-800 font-mono">{lineTotal.toLocaleString('he-IL')} ₪</td>
                                                </tr>
                                              );
                                            })}
                                            <tr className="bg-emerald-50/20 font-bold border-t border-emerald-100 text-emerald-900">
                                              <td colSpan="6" className="p-2.5 text-right text-xs">סה"כ אומדן הצעת מחיר (לא כולל מע"מ):</td>
                                              <td className="p-2.5 text-left text-xs font-extrabold font-mono border-b-2 border-double border-emerald-600">
                                                {totalSum.toLocaleString('he-IL')} ₪
                                              </td>
                                            </tr>
                                          </>
                                        );
                                      } catch (e) {
                                        return <tr><td colSpan="7" className="p-3 text-center text-red-500">שגיאה בפענוח כתב הכמויות</td></tr>;
                                      }
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {after && <div className="mt-6 border-t border-slate-100 pt-4">{renderCleanContentWithTables(after)}</div>}
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <p className="text-text-muted text-xs italic py-4 text-center">לא הופקה הצעת מחיר היסטורית עבור פרויקט זה.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* הבוט הצף של ברבור להתייעצות */}
      <AIFloatingWidget projectId={projectId} />
    </div>
  );
}
