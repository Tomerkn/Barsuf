import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle2, PlayCircle, Loader2, RefreshCw } from 'lucide-react';

export function ProjectGantt({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', start_date: '', end_date: '', progress: 0 });
  
  // Monday Sync State
  const [showMondayModal, setShowMondayModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mondayToken, setMondayToken] = useState('eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI');
  const [mondayBoardId, setMondayBoardId] = useState('5089388529');

  const fetchTasks = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const [editingId, setEditingId] = useState(null);

  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleEditTask = (task) => {
    setEditingId(task.id);
    setNewTask({
      name: task.name,
      start_date: new Date(task.start_date).toISOString().split('T')[0],
      end_date: new Date(task.end_date).toISOString().split('T')[0],
      progress: task.progress || 0
    });
    setIsAdding(true);
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) return;
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    if (!newTask.name || !newTask.start_date || !newTask.end_date) return;
    
    try {
      if (editingId) {
        await fetch(`/api/tasks/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
      } else {
        await fetch(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTask)
        });
      }
      setNewTask({ name: '', start_date: '', end_date: '', progress: 0 });
      setIsAdding(false);
      setEditingId(null);
      fetchTasks();
    } catch (error) {
      console.error('Error saving task', error);
    }
  };

  const updateProgress = async (task, newProgress) => {
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, progress: newProgress })
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task', error);
    }
  };

  const handleMondaySync = async (e) => {
    e.preventDefault();
    if (!mondayToken || !mondayBoardId) return;
    
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sync-monday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mondayToken, boardId: mondayBoardId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to sync');
      }
      setShowMondayModal(false);
      fetchTasks();
    } catch (error) {
      alert('שגיאה בסנכרון מול מאנדיי: ' + error.message);
      console.error('Monday sync error', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-brand)]" /></div>;
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border p-6 mt-8 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--color-brand)]" />
            לוחות זמנים (Gantt)
          </h2>
          <p className="text-sm text-text-secondary">תכנון ומעקב אחר שלבי הבניה</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMondayModal(true)}
            className="bg-[#6161ff] hover:bg-[#4d4dcc] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            סנכרן מ-Monday
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            משימה חדשה
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={submitTask} className="bg-surface-hover p-4 rounded-xl border border-border mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-text-secondary mb-1">שם המשימה/שלב</label>
            <input 
              type="text" 
              required
              placeholder="למשל: יציקת רצפה"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.name}
              onChange={e => setNewTask({...newTask, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">תאריך התחלה</label>
            <input 
              type="date" 
              required
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.start_date}
              onChange={e => setNewTask({...newTask, start_date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">תאריך סיום צפוי</label>
            <input 
              type="date" 
              required
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[var(--color-brand)]"
              value={newTask.end_date}
              onChange={e => setNewTask({...newTask, end_date: e.target.value})}
            />
          </div>
          <button type="submit" className="bg-text-primary hover:bg-black dark:hover:bg-white text-surface px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            שמור
          </button>
        </form>
      )}

      {showMondayModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#6161ff]" />
              סנכרון מול Monday.com
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              הזן את פרטי ההתחברות שלך כדי למשוך את המשימות מלוח ה-Monday שלך ישירות לכאן. שים לב: זה יחליף את המשימות הקיימות בפרויקט זה.
            </p>
            
            <form onSubmit={handleMondaySync} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">API Token</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#6161ff]"
                  value={mondayToken}
                  onChange={e => setMondayToken(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Board ID (מזהה לוח)</label>
                <input 
                  type="text" 
                  required
                  placeholder="למשל: 5089388529"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-[#6161ff]"
                  value={mondayBoardId}
                  onChange={e => setMondayBoardId(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowMondayModal(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  disabled={isSyncing}
                  className="bg-[#6161ff] hover:bg-[#4d4dcc] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  סנכרן עכשיו
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-surface-hover">
          <Clock className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">אין משימות בלוח הזמנים</p>
          <p className="text-sm text-text-muted mt-1">הוסף משימה חדשה כדי להתחיל לעקוב אחר התקדמות הבניה</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">שם המשימה/שלב</th>
                <th className="px-4 py-3 font-medium">תאריך התחלה</th>
                <th className="px-4 py-3 font-medium">תאריך סיום צפוי</th>
                <th className="px-4 py-3 font-medium text-center">משך (ימים)</th>
                <th className="px-4 py-3 font-medium">התקדמות</th>
                <th className="px-4 py-3 font-medium text-center w-24">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map(task => {
                const days = calculateDays(task.start_date, task.end_date);
                const isComplete = task.progress === 100;
                
                return (
                  <tr key={task.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-[#10b981]" />
                        ) : (
                          <div className={`w-3 h-3 rounded-full ${task.progress > 0 ? 'bg-[var(--color-brand)]' : 'bg-gray-300'}`}></div>
                        )}
                        <span className={`font-medium ${isComplete ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{task.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-text-secondary">{new Date(task.start_date).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-4 text-sm text-text-secondary font-medium">{new Date(task.end_date).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-4 text-sm text-text-primary text-center">
                      <span className="bg-surface border border-border px-2 py-1 rounded-md">{days}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={task.progress} 
                          onChange={(e) => updateProgress(task, parseInt(e.target.value))}
                          className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-[var(--color-brand)]"
                        />
                        <span className="text-xs font-medium text-text-secondary w-8 text-left">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEditTask(task)} className="text-text-muted hover:text-[var(--color-brand)] transition-colors" title="עריכה">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} className="text-text-muted hover:text-red-500 transition-colors" title="מחיקה">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
