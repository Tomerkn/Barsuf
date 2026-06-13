import React, { useState, useEffect } from 'react'; // הכלים הבסיסיים של ריאקט לבניית המסך
import { Link } from 'react-router-dom'; // ניווט וקישורים
import { api } from '../services/api'; // החיבור שלנו לשרת כדי לבקש נתונים
import { 
  FileSearch, Upload, Plus, Clock, CheckCircle, AlertCircle, 
  FileText, Download, BrainCircuit, TrendingUp, Search, Loader2, ChevronRight,
  Trash2, Briefcase, ExternalLink
} from 'lucide-react'; // אוסף האייקונים היפים שמעצבים את הדף
import { TargetPriceCalculator } from '../components/ui/TargetPriceCalculator';
import { AIFloatingWidget } from '../components/ui/AIFloatingWidget';

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

const downloadProposalAsPDF = (tender) => {
  const element = document.getElementById(`proposal-container-${tender.id}`);
  if (!element) return;
  
  // שכפול האלמנט לצורך עיצוב נקי ל-PDF
  const cloned = element.cloneNode(true);
  cloned.style.padding = '35px';
  cloned.style.backgroundColor = '#ffffff';
  cloned.style.color = '#1e293b';
  
  // הסרת כפתורי הורדה או בקרים אחרים שאינם רלוונטיים ל-PDF
  const buttons = cloned.querySelectorAll('button');
  buttons.forEach(b => b.remove());

  // הוספת לוגו וכותרת מכתב רשמי
  const header = document.createElement('div');
  header.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; direction: rtl; font-family: system-ui, -apple-system, sans-serif;">
      <div>
        <h1 style="color: #064e3b; font-size: 22px; font-weight: 800; margin: 0;">בארסוף הנדסה ובנייה בע"מ</h1>
        <p style="font-size: 11px; color: #475569; margin: 5px 0 0 0;">מערכת ברבור AI - ניתוח מכרזים והצעות מחיר</p>
      </div>
      <div style="text-align: left; font-size: 11px; color: #475569; direction: ltr;">
        <p style="margin: 0;">תאריך: ${new Date().toLocaleDateString('he-IL')}</p>
        <p style="margin: 3px 0 0 0;">מכרז: ${tender.name.replace('.pdf', '')}</p>
      </div>
    </div>
  `;
  cloned.insertBefore(header, cloned.firstChild);

  // הוספת כותרת תחתונה
  const footer = document.createElement('div');
  footer.innerHTML = `
    <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; direction: rtl; font-family: system-ui, -apple-system, sans-serif;">
      <p style="margin: 0;">חתימת המציע: בארסוף הנדסה ובנייה בע"מ</p>
      <p style="margin: 0;">הופק אוטומטית באמצעות מערכת ברבור AI</p>
    </div>
  `;
  cloned.appendChild(footer);

  const opt = {
    margin:       10,
    filename:     `הצעת_מחיר_${tender.name.replace('.pdf', '')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  if (window.html2pdf) {
    window.html2pdf().set(opt).from(cloned).save();
  } else {
    // מנגנון גיבוי במידה והספרייה לא נטענה
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>הדפסת הצעה</title></head><body style="direction: rtl; font-family: system-ui;">${cloned.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  }
};

export default function Tenders() {
  // --- המשתנים של הדף (הזיכרון המקומי של המסך) ---
  const [tenders, setTenders] = useState([]); // רשימת המכרזים שהעלינו
  const [loading, setLoading] = useState(true); // האם אנחנו בטעינה ראשונית?
  const [uploading, setUploading] = useState(false); // האם קובץ עולה עכשיו?
  const [selectedTender, setSelectedTender] = useState(null); // איזה מכרז המשתמש בחר לראות כרגע
  const [generating, setGenerating] = useState(false); // האם ברבור מייצר עכשיו הצעת מחיר?
  const [converting, setConverting] = useState(false); // האם אנחנו באמצע העברה לפרויקט?
  const [newProjectLink, setNewProjectLink] = useState(null); // קישור לפרויקט החדש שנוצר מהמכרז
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    "ברבור קורא את האותיות הקטנות...",
    "מזהה תנאי סף ודרישות חובה...",
    "מחשב לוחות זמנים וקנסות...",
    "מגבש סיכום מנהלים חכם..."
  ];

  useEffect(() => {
    let interval;
    if (uploading || generating) {
      interval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % loadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [uploading, generating]);

  // מנגנון רענון אוטומטי כדי לראות סטטוס חי של ברבור
  // עוצר פולינג כשהמכרז הושלם, נכשל, או שאין בעיבוד
  useEffect(() => {
    const hasInProgress = generating || tenders.some(t => 
      t.status !== 'נותח' && 
      t.status !== 'הצעה מוכנה' && 
      t.status !== 'מוכן' &&
      t.status !== 'שגיאה' &&
      t.status !== 'הועבר לפרויקט' &&
      t.status !== null
    );

    // מנגנון רענון מהיר (כל 1 שניה) בעת ניתוח/טעינה פעילים לעדכון הסטטוס ומד ההתקדמות
    if (hasInProgress) {
      const interval = setInterval(async () => {
        try {
          const data = await api.getTenders();
          setTenders(prev => {
            const tempTenders = prev.filter(t => t.id < 0);
            return [...tempTenders, ...data.filter(t => !tempTenders.some(temp => temp.name === t.name))];
          });
          setSelectedTender(prev => {
            if (!prev) return null;
            if (prev.id < 0) return prev; // שמור על בחירת המכרז הזמני שעדיין עולה
            return data.find(t => t.id === prev.id) || prev;
          });
        } catch (err) {
          console.error("Polling tenders failed:", err);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tenders, generating]);

  useEffect(() => {
    fetchTenders();
  }, []);

  // פונקציה שמושכת את המכרזים ומעדכנת את המסך
  const fetchTenders = async () => {
    try {
      const data = await api.getTenders();
      setTenders(prev => {
        const tempTenders = prev.filter(t => t.id < 0);
        return [...tempTenders, ...data.filter(t => !tempTenders.some(temp => temp.name === t.name))];
      });
    } catch (error) {
      console.error('אופס, לא הצלחנו להביא את המכרזים:', error);
    } finally {
      setLoading(false);
    }
  };

  // מה קורה כשבוחרים קובץ מכרז (PDF) ומעלים אותו
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true); // מראים למשתמש שאנחנו עובדים
    setNewProjectLink(null); // מאפסים קישור ישן
    
    // עדכון אופטימי מיידי ב-UI
    const tempTender = {
      id: -Date.now(),
      name: file.name,
      upload_date: new Date().toISOString(),
      status: 'מעלה...',
      analysis: null,
      proposal: null,
      boq_json: null,
      project_id: null
    };
    
    setTenders(prev => [tempTender, ...prev]);
    setSelectedTender(tempTender);
    
    try {
      const res = await api.createTender(file); // שולחים את הקובץ לשרת ומקבלים מזהה מיידי
      const data = await api.getTenders();
      setTenders(data);
      
      let newT;
      if (res && res.id) {
        newT = data.find(t => t.id === res.id);
        if (newT) setSelectedTender(newT);
      }
      
      setUploading(false); // העלאה הסתיימה, מורידים את העיגול המסתובב מהכפתור
      
      // הפעלת הניתוח באופן אסינכרוני ברקע כדי שהפולינג יציג את ההתקדמות ב-UI
      if (res && res.id) {
        api.analyzeTender(res.id).catch(err => {
          console.error("שגיאה במהלך הניתוח האוטומטי:", err);
        });
      }
    } catch (error) {
      setTenders(prev => prev.filter(t => t.id !== tempTender.id));
      setSelectedTender(null);
      alert('משהו השתבש בהעלאה, נסה שוב.');
      setUploading(false);
    }
  };

  // הפקודה לברבור: "קח את המכרז הזה ותכין לי הצעה על בסיס העבר"
  const generateProposal = async (id) => {
    setGenerating(true);
    setNewProjectLink(null);
    try {
      await api.generateTenderProposal(id); // הקסם קורה פה בשרת
      await fetchTenders(); // מרעננים נתונים
      // מוודאים שהמסך מראה את המכרז המעודכן עם ההצעה
      const updated = await api.getTenders();
      const updatedTender = updated.find(t => t.id === id);
      setSelectedTender(updatedTender);

      // הורדה אוטומטית של קובץ ה-PDF לעמדת הקצה לאחר שהדף התעדכן
      if (updatedTender && updatedTender.proposal) {
        setTimeout(() => {
          downloadProposalAsPDF(updatedTender);
        }, 1000);
      }
    } catch (error) {
      alert('ברבור נתקע קצת ביצירת ההצעה, נסה שוב.');
    } finally {
      setGenerating(false);
    }
  };

  // מחיקת מכרז מהמערכת
  const handleDeleteTender = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך להסיר מכרז זה מהרשימה?')) return;
    try {
      await api.deleteResource('tenders', id);
      setSelectedTender(null);
      await fetchTenders();
    } catch (error) {
      alert('לא הצלחנו למחוק את המכרז: ' + error.message);
    }
  };

  // העברת מכרז לפרויקטים פעילים
  const handleConvertToProject = async (id) => {
    if (!window.confirm('האם ברצונך להעביר מכרז זה לפרויקטים הפעילים בחברה?\n\nפעולה זו תיצור פרויקט חדש המבוסס על המכרז, תגדיר סעיפי תקציב ראשוניים מתוך כתב הכמויות, ותעביר את הניתוח המלא והקובץ המקורי.')) return;
    
    setConverting(true);
    setNewProjectLink(null);
    try {
      const result = await api.convertTenderToProject(id);
      if (result.success && result.projectId) {
        setNewProjectLink(`/projects/${result.projectId}`);
        const data = await api.getTenders();
        setTenders(data);
        const updated = data.find(t => t.id === id);
        if (updated) setSelectedTender(updated);
      } else {
        throw new Error('שגיאה במהלך העברת המכרז');
      }
    } catch (error) {
      alert('נכשל בהעברת המכרז לפרויקט: ' + error.message);
    } finally {
      setConverting(false);
    }
  };

  // איפוס הצעת מחיר כדי לאפשר הדגמה חוזרת
  const handleResetProposal = async (id) => {
    if (!window.confirm('האם ברצונך לאפס את הצעת המחיר של מכרז זה? פעולה זו תאפשר להדגים שוב את הפקת הצעת המחיר האוטומטית.')) return;
    try {
      await api.resetTenderProposal(id);
      const data = await api.getTenders();
      setTenders(data);
      const updated = data.find(t => t.id === id);
      if (updated) setSelectedTender(updated);
    } catch (error) {
      alert('נכשל באיפוס הצעת המחיר: ' + error.message);
    }
  };

  // שחזר נתוני דמו מלאים לאיפוס המצגת מחר
  const handleReseed = async () => {
    if (!window.confirm('האם ברצונך לאפס ולשחזר את כל נתוני ההדגמה של המערכת? כל השינויים שביצעת יימחקו והמערכת תחזור למצב הדמו האופטימלי.')) return;
    setLoading(true);
    try {
      await api.reseed();
      const data = await api.getTenders();
      setTenders(data);
      setSelectedTender(null);
      setNewProjectLink(null);
      alert('נתוני ההדגמה שוחזרו בהצלחה!');
    } catch (error) {
      alert('שגיאה בשחזור נתוני הדמו: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // אם המערכת עדיין טוענת את המכרזים, נראה עיגול מסתובב
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-full overflow-hidden">
      {/* כפתור חזרה וכותרת הדף */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs"
          >
            <ChevronRight className="w-4 h-4" />
            <span>חזרה לפרויקטים</span>
          </Link>

          <button 
            onClick={handleReseed}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-all font-bold text-xs shadow-sm cursor-pointer"
            title="איפוס ושחזר נתוני הדמו למצב התחלתי"
          >
            <Clock className="w-4 h-4" />
            <span>שחזר נתוני הדגמה</span>
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">ניהול מכרזים חכם</h1>
            <p className="text-text-secondary text-sm">ניתוח מכרזים והפקת הצעות מחיר מבוססות בינה מלאכותית</p>
          </div>
          {/* כפתור ההעלאה בראש הדף יוצג רק כאשר מכרז כלשהו נבחר, למניעת כפילות מול תיבת ההעלאה המרכזית */}
          {selectedTender && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-brand)] text-white rounded-xl hover:bg-[var(--color-brand-dark)] transition-all cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span className="font-medium text-sm">העלאת מכרז חדש</span>
                <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* באנר הצלחה על העברה לפרויקט */}
      {newProjectLink && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm shrink-0">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">המכרז הועבר בהצלחה לפרויקטים הפעילים!</p>
              <p className="text-xs text-emerald-700">כל הניתוחים החכמים, כתב הכמויות, אומדן התקציב וקובץ המכרז תועדו ונשמרו בהצלחה בפרויקט החדש.</p>
            </div>
          </div>
          <Link 
            to={newProjectLink} 
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors shrink-0 shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            צפה בפרויקט החדש
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* צד ימין: רשימת המכרזים האחרונים */}
        <div className="xl:col-span-1 lg:col-span-1 flex flex-col h-full overflow-hidden">
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between shrink-0">
              <h2 className="font-bold flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-[var(--color-brand)]" />
                מכרזים אחרונים
              </h2>
            </div>
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {tenders.map((tender) => (
                <button
                  key={tender.id}
                  onClick={() => setSelectedTender(tender)}
                  className={`w-full p-4 text-right hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 ${selectedTender?.id === tender.id ? 'bg-blue-50/50 border-r-4 border-[var(--color-brand)]' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{tender.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-xs text-text-muted">{new Date(tender.upload_date).toLocaleDateString('he-IL')}</span>
                    </div>
                    {tender.boq_json && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        מחיר מטרה: {JSON.parse(tender.boq_json).reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()} ₪
                      </div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    tender.status === 'הועבר לפרויקט' ? 'bg-purple-100 text-purple-700' :
                    tender.status === 'נותח' ? 'bg-emerald-100 text-emerald-700' :
                    tender.status === 'נותח (ראשוני)' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                    tender.status === 'הצעה מוכנה' || tender.status === 'מוכן' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {tender.status}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* צד שמאל: תצוגת התוכן (ניתוח והצעת מחיר) */}
        <div className="xl:col-span-3 lg:col-span-2 h-full overflow-hidden">
          {selectedTender ? (
            <div className="bg-surface border border-border rounded-2xl shadow-sm h-full flex flex-col overflow-hidden">
              {/* כותרת המכרז הנבחר */}
              <div className="p-6 border-b border-border flex items-center justify-between bg-slate-50/30 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-border">
                    <FileText className="w-6 h-6 text-[var(--color-brand)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedTender.name}</h2>
                    <p className="text-xs text-text-muted">מזהה פנימי: {selectedTender.id}</p>
                  </div>
                </div>
                {/* כפתורי פעולה למכרז */}
                <div className="flex items-center gap-3">
                  {/* כפתור מחיקה */}
                  <button 
                    onClick={() => handleDeleteTender(selectedTender.id)}
                    className="flex items-center gap-2 px-3.5 py-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 rounded-xl transition-all border border-red-100 font-bold text-xs"
                    title="מחק מכרז לצמיתות"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>מחק מכרז</span>
                  </button>

                  {/* כפתור מעבר לפרויקט הקיים אם כבר הועבר */}
                  {selectedTender.project_id ? (
                    <Link 
                      to={`/projects/${selectedTender.project_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-sm font-bold text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>צפה בפרויקט הפעיל</span>
                    </Link>
                  ) : (
                    /* כפתור העברה לפרויקטים (מוצג רק אם עדיין לא הועבר) */
                    selectedTender.analysis && selectedTender.status !== 'שגיאה' && (
                      <button 
                        onClick={() => handleConvertToProject(selectedTender.id)}
                        disabled={converting}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-brand)] text-white rounded-xl hover:bg-[#46a2aa] transition-all shadow-sm font-bold text-xs disabled:opacity-50"
                      >
                        {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
                        <span>העבר לפרויקטים שנותחו</span>
                      </button>
                    )
                  )}

                  {/* כפתור איפוס הצעת מחיר להדגמה חוזרת */}
                  {selectedTender.proposal && (
                    <button 
                      onClick={() => handleResetProposal(selectedTender.id)}
                      className="flex items-center gap-2 px-3.5 py-2 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all border border-amber-100 font-bold text-xs cursor-pointer"
                      title="אפס הצעה לצורך הדגמה חוזרת"
                    >
                      <Clock className="w-4 h-4" />
                      <span>אפס הצעת מחיר</span>
                    </button>
                  )}

                  {/* כפתור הפקת הצעה - מופיע רק אם המכרז כבר נותח אבל עדיין אין הצעה */}
                  {!selectedTender.proposal && (selectedTender.status === 'נותח' || selectedTender.status === 'הועבר לפרויקט') && (
                    <button 
                      onClick={() => generateProposal(selectedTender.id)}
                      disabled={generating}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm font-bold text-xs cursor-pointer"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                      <span>הפקת הצעת מחיר אוטומטית</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-white/50">
                {/* אזור ניתוח המכרז (תנאי סף, לו"ז וכו') */}
                <section>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700 border-b pb-2">
                    <Search className="w-5 h-5 text-blue-500" />
                    ניתוח מכרז חכם
                  </h3>
                  <div className="prose prose-sm max-w-none text-right text-text-primary bg-blue-50/30 p-4 rounded-xl border border-blue-100 leading-relaxed whitespace-pre-wrap relative">
                    {selectedTender.analysis ? (
                      <>
                        {/* באנר שלב 1 - מוצג כשהניתוח העמוק עדיין רץ */}
                        {selectedTender.status === 'נותח (ראשוני)' && (
                          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span><strong>ניתוח ראשוני מוכן.</strong> ברבור מעמיק את הנתונים ברקע — הדף יתעדכן אוטומטית.‏</span>
                          </div>
                        )}
                        {selectedTender.analysis.includes('[CONFIDENCE]') && (
                          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-150 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-white rounded-xl shadow-sm border border-blue-100 text-blue-600">
                                <BrainCircuit className="w-5 h-5 text-blue-600 animate-pulse" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-slate-800">מדד וודאות ניתוח של ברבור</h4>
                                <p className="text-xs text-slate-500">מידת הדיוק והביטחון של הניתוח החכם</p>
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                              {(() => {
                                const conf = parseInt(selectedTender.analysis.match(/\[CONFIDENCE\](\d+)\[\/CONFIDENCE\]/)?.[1] || '0');
                                const color = conf > 80 ? 'text-emerald-600' : conf > 50 ? 'text-amber-600' : 'text-red-600';
                                return (
                                  <>
                                    <span className={`text-3xl font-extrabold ${color}`}>{conf}</span>
                                    <span className={`text-sm font-bold ${color}`}>%</span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{renderCleanContentWithTables(selectedTender.analysis)}</div>
                      </>
                    ) : selectedTender.status === 'שגיאה' ? (
                      // מצב שגיאה - מציג הודעה ברורה ולא טעינה
                      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400" />
                        <div>
                          <p className="font-bold text-red-600 text-base">ברבור נתקל בבעיה בניתוח המכרז</p>
                          <p className="text-text-muted text-sm mt-1">הקובץ אולי פגום, מוגן בסיסמה, או שהשירות זמנית עמוס.</p>
                        </div>
                        <label className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                          <span>העלה את המכרז מחדש</span>
                          <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                      </div>
                    ) : (
                      // מצב טעינה תקין - מציג פס התקדמות
                      <div className="flex flex-col items-center justify-center py-8 gap-4">
                        <div className="flex items-center gap-3 text-[var(--color-brand)] font-bold animate-pulse">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {selectedTender.status || "מעבד נתונים..."}
                        </div>
                        <div className="w-full max-w-xs bg-blue-100 h-1.5 rounded-full overflow-hidden">
                          {/* חישוב דינמי של רוחב פס ההתקדמות בהתאם לסטטוסים האמיתיים שמחזיר השרת */}
                          <div 
                            className="bg-[var(--color-brand)] h-full transition-all duration-700 ease-in-out" 
                            style={{ 
                              width: selectedTender.status === 'נותח (ראשוני)' ? '75%' :
                                     selectedTender.status?.includes('קורא') ? '25%' :
                                     selectedTender.status?.includes('שלב 1') ? '55%' :
                                     selectedTender.status?.includes('הושלם') || selectedTender.status?.includes('הועבר') || selectedTender.status === 'נותח' ? '100%' :
                                     selectedTender.status === 'מעלה...' ? '10%' :
                                     '40%'
                            }}
                          />
                        </div>
                        <p className="text-xs text-text-muted">זה עשוי לקחת עד דקה עבור קבצים גדולים</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* אזור הצעת המחיר (אם כבר הופקה או בהכנה) */}
                {(selectedTender.proposal || generating || selectedTender.status === 'מתחבר למאגר המחירים ההיסטורי...' || selectedTender.status === 'מנתח כמויות וסעיפים מול ההיסטוריה...' || selectedTender.status === 'בונה כתב כמויות (BoQ) ומחשב מחיר מטרה...') && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    {!selectedTender.proposal ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                        <div className="flex items-center gap-3 text-emerald-600 font-bold animate-pulse">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          {selectedTender.status || "מכין הצעת מחיר..."}
                        </div>
                        <div className="w-full max-w-xs bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-700 ease-in-out" 
                            style={{ 
                              width: selectedTender.status?.includes('מתחבר') ? '20%' :
                                     selectedTender.status?.includes('מנתח') ? '50%' :
                                     selectedTender.status?.includes('בונה') ? '85%' :
                                     '10%'
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div id={`proposal-container-${selectedTender.id}`}>
                        <div className="flex items-center justify-between mb-4 border-b pb-2">
                          <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-700">
                            <TrendingUp className="w-5 h-5" />
                            הצעת מחיר מבוססת היסטוריה
                          </h3>
                          <button
                            onClick={() => downloadProposalAsPDF(selectedTender)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold shadow-sm cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            הורד הצעה כ-PDF
                          </button>
                        </div>
                        <div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100 shadow-inner mb-6">
                          {selectedTender.proposal.includes('[CONFIDENCE]') && (
                            <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-150 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-emerald-100 text-emerald-600">
                                  <TrendingUp className="w-5 h-5 text-emerald-600 animate-pulse" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800">מדד וודאות הצעה של ברבור</h4>
                                  <p className="text-xs text-slate-500">מידת הדיוק בהערכת המחיר ההיסטורי</p>
                                </div>
                              </div>
                              <div className="flex items-baseline gap-1">
                                {(() => {
                                  const conf = parseInt(selectedTender.proposal.match(/\[CONFIDENCE\](\d+)\[\/CONFIDENCE\]/)?.[1] || '0');
                                  const color = conf > 80 ? 'text-emerald-600' : conf > 50 ? 'text-amber-600' : 'text-red-600';
                                  return (
                                    <>
                                      <span className={`text-3xl font-extrabold ${color}`}>{conf}</span>
                                      <span className={`text-sm font-bold ${color}`}>%</span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          <div className="prose prose-sm max-w-none text-right text-text-primary whitespace-pre-wrap leading-relaxed">
                            {renderCleanContentWithTables(selectedTender.proposal)}
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* מחשבון מחיר מטרה — מופיע מיד אחרי הניתוח, גם בלי הצעה */}
                {selectedTender.boq_json && (
                  <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-6 pb-6">
                    <TargetPriceCalculator 
                      tenderId={selectedTender.id} 
                      initialBoqJson={selectedTender.boq_json} 
                    />
                    {/* CTA להפקת הצעה מלאה אם עוד לא הופקה */}
                    {!selectedTender.proposal && (selectedTender.status === 'נותח' || selectedTender.status === 'הועבר לפרויקט') && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => generateProposal(selectedTender.id)}
                          disabled={generating}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow text-sm font-bold"
                        >
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                          הפק הצעת מחיר מפורטת על בסיס ההיסטוריה שלנו
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          ) : (
            // מסך ריק שמופיע כשעדיין לא נבחר מכרז מהרשימה
            <div className="bg-gradient-to-br from-white/90 to-slate-50/50 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-lg h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-md w-full bg-white/70 border border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center gap-6 shadow-sm hover:border-[var(--color-brand)] hover:bg-white/90 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-50 text-[var(--color-brand)] rounded-2xl flex items-center justify-center shadow-inner">
                  <FileSearch className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">בחר מכרז או העלה אחד חדש</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">העלה קובץ PDF של המכרז וברבור ינתח את תנאי הסף, לוחות הזמנים, יבנה אומדן ויחשב מחיר מטרה בתוך שניות.</p>
                </div>
                
                <label className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-brand)] text-white rounded-xl hover:bg-[var(--color-brand-dark)] transition-all cursor-pointer shadow-md font-bold text-sm">
                  <Upload className="w-4 h-4" />
                  <span>בחירת קובץ PDF</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* הבוט הצף של ברבור להתייעצות לגבי המכרז */}
      {selectedTender && (
        <AIFloatingWidget tenderId={selectedTender.id} />
      )}
    </div>
  );
}
