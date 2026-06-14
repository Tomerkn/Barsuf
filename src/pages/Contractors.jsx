import React, { useEffect, useState } from 'react'; // מביאים את הכלים של ריאקט
import { api } from '../services/api'; // השליח שמדבר עם השרת
import { Loader2, Plus, HardHat, Phone, Mail, Pencil, Trash2, Settings, RefreshCw, CheckCircle } from 'lucide-react'; // אייקונים יפים
import { Modal } from '../components/ui/Modal'; // חלונית קופצת להוספת נתונים

export function Contractors() { // דף ניהול רשימת הקבלנים
  const [contractors, setContractors] = useState([]); // רשימת הקבלנים שנשמרת כאן
  const [loading, setLoading] = useState(true); // האם אנחנו מחכים למידע מהשרת
  const [isModalOpen, setIsModalOpen] = useState(false); // האם החלונית להוספת קבלן פתוחה
  const [formData, setFormData] = useState({ name: '', specialization: '', phone: '', email: '' }); // הנתונים שהמשתמש ממלא בטופס
  const [submitting, setSubmitting] = useState(false); // האם אנחנו באמצע שמירת נתונים
  const [editingId, setEditingId] = useState(null); // אם אנחנו עורכים קבלן קיים, כאן נשמר המספר שלו

  // הגדרות אינטגרציה מול Monday.com עבור קבלנים
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // האם חלונית הגדרות מונדיי פתוחה
  const [mondayToken, setMondayToken] = useState('');
  const [mondayBoardId, setMondayBoardId] = useState('');
  const [mondayAutoSync, setMondayAutoSync] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchContractors = async () => { // פונקציה שמביאה את כל הקבלנים מהשרת
    try {
      const data = await api.getContractors(); // מבקשים את הרשימה מהשרת
      setContractors(data); // מעדכנים את הרשימה על המסך
    } catch (error) {
      console.error(error); // רישום שגיאה במידה והייתה תקלה
    } finally {
      setLoading(false); // מפסיקים להראות טעינה
    }
  };

  const fetchMondaySettings = async () => { // שליפת הגדרות מונדיי הגלובליות לקבלנים
    try {
      const data = await api.getMondayContractorsSettings();
      setMondayToken(data.token);
      setMondayBoardId(data.boardId);
      setMondayAutoSync(data.autoSync);
    } catch (e) {
      console.error('Failed to load Monday settings:', e);
    }
  };

  useEffect(() => { // מפעילים את הבאת הנתונים ברגע שהדף עולה
    fetchContractors();
    fetchMondaySettings();
  }, []);

  const handleSaveSettings = async (e) => { // שמירת הגדרות ה-API של מונדיי
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.saveMondayContractorsSettings(mondayToken, mondayBoardId, mondayAutoSync);
      setIsSettingsOpen(false);
      alert('הגדרות סנכרון קבלנים נשמרו בהצלחה!');
    } catch (error) {
      console.error(error);
      alert('שגיאה בשמירת הגדרות סנכרון: ' + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportContractors = async () => { // סנכרון יזום של כל הקבלנים
    if (!window.confirm('האם לייצא את כל קבלני המערכת ללוח ה-Monday.com כעת?')) return;
    setExporting(true);
    try {
      const res = await api.exportContractorsToMonday();
      alert(`הייצוא הושלם בהצלחה! סונכרנו ${res.exported} קבלנים ל-Monday.com.`);
      await fetchContractors();
    } catch (error) {
      console.error(error);
      alert('שגיאה בייצוא קבלנים ל-Monday: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e) => { // מה קורה כשהמשתמש שומר קבלן חדש או עורך קיים
    e.preventDefault(); // מונע מהדף להתרענן
    setSubmitting(true); // מראה שאנחנו בטעינה
    try {
      if (editingId) { // אם אנחנו במצב עריכה
        await api.updateResource('contractors', editingId, formData);
      } else { // אם אנחנו מוסיפים קבלן חדש
        await api.createContractor(formData);
      }
      setIsModalOpen(false); // סוגרים את החלונית
      setEditingId(null); // מאפסים את מצב העריכה
      setFormData({ name: '', specialization: '', phone: '', email: '' }); // מנקים את הטופס
      await fetchContractors(); // מרעננים את הרשימה על המסך
    } catch (error) {
      console.error('Failed to save contractor:', error); // אם נכשל
    } finally {
      setSubmitting(false); // סיום מצב השמירה
    }
  };

  const handleDelete = async (id) => { // מחיקת קבלן מהמערכת
    if (!window.confirm('האם אתה בטוח שברצונך למחוק קבלן זה?')) return; // בקשת אישור מהמשתמש
    try {
      await api.deleteResource('contractors', id); // מבקשים מהשרת למחוק
      await fetchContractors(); // מרעננים את הרשימה
    } catch (error) {
      console.error('Failed to delete:', error); // אם נכשל
    }
  };

  const handleEdit = (contractor) => { // פתיחת טופס העריכה עם הנתונים הקיימים
    setEditingId(contractor.id); // זוכרים איזה קבלן אנחנו עורכים
    setFormData({
      name: contractor.name,
      specialization: contractor.specialization || '',
      phone: contractor.phone || '',
      email: contractor.email || ''
    });
    setIsModalOpen(true); // פותחים את החלונית
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>; // סמל טעינה

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">קבלנים</h1> {/* כותרת הדף */}
          <p className="text-text-secondary text-sm">מאגר קבלני ביצוע ויעוץ בסנכרון Monday.com</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="border border-border bg-surface hover:bg-surface-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            הגדרות Monday.com
          </button>
          <button 
            onClick={() => {
              setEditingId(null); // מאפסים עריכה כדי ליצור חדש
              setFormData({ name: '', specialization: '', phone: '', email: '' }); // טופס נקי
              setIsModalOpen(true); // פתיחת החלונית
            }}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            הוסף קבלן
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {/* טבלת קבלנים */}
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">שם קבלן</th>
              <th className="px-6 py-4 font-medium">התמחות</th>
              <th className="px-6 py-4 font-medium">טלפון</th>
              <th className="px-6 py-4 font-medium">דוא"ל</th>
              <th className="px-6 py-4 font-medium w-24">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contractors.map(c => (
              <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] shrink-0">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-text-primary flex items-center gap-1.5">
                        {c.name}
                        {c.monday_id && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="סונכרן מול Monday.com" />
                        )}
                      </span>
                      {c.monday_id && (
                        <span className="text-[10px] text-emerald-600 font-semibold">סונכרן ל-Monday</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{c.specialization}</td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <div className="flex items-center gap-2" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    <span>{c.phone}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    {c.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <button onClick={() => handleEdit(c)} className="p-1 text-text-muted hover:text-[var(--color-brand)] transition-colors" title="ערוך">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1 text-text-muted hover:text-red-500 transition-colors" title="מחק">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {/* הודעה אם אין קבלנים */}
            {contractors.length === 0 && (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-text-muted">לא נמצאו קבלנים במאגר.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* חלונית להוספת או עריכת קבלן */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "עריכת קבלן" : "הוספת קבלן חדש"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">שם הקבלן / חברה</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">התמחות</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">טלפון</label>
            <input 
              type="tel" required dir="ltr"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] text-left"
              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">דוא"ל</label>
            <input 
              type="email" required dir="ltr"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] text-left"
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור קבלן'}
            </button>
          </div>
        </form>
      </Modal>

      {/* חלונית הגדרות Monday.com */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="הגדרות סנכרון Monday.com לקבלנים">
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 text-right" dir="rtl">
          <p className="text-xs text-text-secondary leading-relaxed">
            הגדר את פרטי החיבור של Monday.com ללוח ניהול קבלני המשנה. מפתח הגישה ומזהה הלוח הוזנו אוטומטית לפי הפרטים שסיפקת.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">מפתח API אישי (Personal Token)</label>
            <input 
              type="password" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] text-xs font-mono"
              value={mondayToken} onChange={e => setMondayToken(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">מזהה לוח (Board ID)</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[var(--color-brand)] font-mono"
              value={mondayBoardId} onChange={e => setMondayBoardId(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <input 
              type="checkbox"
              id="autoSyncCheck"
              checked={mondayAutoSync}
              onChange={e => setMondayAutoSync(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-brand)] cursor-pointer"
            />
            <label htmlFor="autoSyncCheck" className="text-xs text-text-primary font-bold cursor-pointer select-none">
              סנכרון דו-כיווני אוטומטי בזמן אמת
            </label>
          </div>

          <div className="border-t border-border pt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleExportContractors}
              disabled={exporting || !mondayToken || !mondayBoardId}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  מייצא קבלנים...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4.5 h-4.5" />
                  סנכרן וייצא את כל הקבלנים ל-Monday.com כעת
                </>
              )}
            </button>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer">
              ביטול
            </button>
            <button type="submit" disabled={savingSettings} className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer">
              {savingSettings ? 'שומר...' : 'שמור הגדרות'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
