import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2, Plus, ArrowUpRight } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
};

export function ProjectIncomes() {
  const { projectId } = useParams();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    project_id: projectId, 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchIncomes = async () => {
    try {
      const data = await api.getIncomes(projectId);
      // Backend api filters by project if projectId is provided, but just to be sure we also filter locally:
      const projectIncomes = data.filter(i => i.project_id === Number(projectId));
      setIncomes(projectIncomes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createIncome({
        ...formData,
        project_id: projectId,
        amount: Number(formData.amount)
      });
      setIsModalOpen(false);
      setFormData({ project_id: projectId, description: '', amount: '', date: new Date().toISOString().split('T')[0] });
      await fetchIncomes();
    } catch (error) {
      console.error('Failed to create income:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">הכנסות פרויקט</h1>
          <p className="text-text-secondary text-sm">מעקב אחר הכנסות ותשלומים נכנסים (P&L)</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף הכנסה
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">תיאור</th>
              <th className="px-6 py-4 font-medium">תאריך קבלה</th>
              <th className="px-6 py-4 font-medium">סכום הכנסה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {incomes.map(inc => (
              <tr key={inc.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{inc.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{new Date(inc.date).toLocaleDateString('he-IL')}</td>
                <td className="px-6 py-4 font-bold text-[#10b981]">{formatCurrency(inc.amount)}</td>
              </tr>
            ))}
            {incomes.length === 0 && (
              <tr>
                <td colSpan="3" className="px-6 py-12 text-center text-text-muted flex flex-col items-center gap-2">
                  <ArrowUpRight className="w-8 h-8 opacity-50 text-[#10b981]" />
                  <span>לא נמצאו הכנסות בפרויקט זה. מומלץ להוסיף הכנסה או לקשר קבלה.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת הכנסה חדשה">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">תיאור העסקה / הכנסה</label>
            <input 
              type="text" required
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
              value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="לדוגמה: תשלום שלב א' מהלקוח"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">סכום הכנסה (₪)</label>
              <input 
                type="number" required min="0" step="0.01"
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
                value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">תאריך</label>
              <input 
                type="date" required
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-[#10b981]"
                value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-border mt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover rounded-lg transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={submitting} className="bg-[#10b981] hover:bg-[#059669] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? 'שומר...' : 'שמור הכנסה'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
