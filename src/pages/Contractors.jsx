import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Loader2, Plus, HardHat, Phone, Mail } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

export function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', specialization: '', phone: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchContractors = async () => {
    try {
      const data = await api.getContractors();
      setContractors(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createContractor(formData);
      setIsModalOpen(false);
      setFormData({ name: '', specialization: '', phone: '', email: '' });
      await fetchContractors();
    } catch (error) {
      console.error('Failed to create contractor:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-brand)] w-8 h-8" /></div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">קבלנים</h1>
          <p className="text-text-secondary text-sm">מאגר קבלני ביצוע ויעוץ</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[var(--color-brand)] hover:bg-[#46a2aa] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף קבלן
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-surface-hover/50 border-b border-border text-sm text-text-secondary">
            <tr>
              <th className="px-6 py-4 font-medium">שם קבלן</th>
              <th className="px-6 py-4 font-medium">התמחות</th>
              <th className="px-6 py-4 font-medium">טלפון</th>
              <th className="px-6 py-4 font-medium">דוא"ל</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contractors.map(c => (
              <tr key={c.id} className="hover:bg-surface-hover/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)]">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-text-primary">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-text-secondary">{c.specialization}</td>
                <td className="px-6 py-4 text-sm text-text-primary flex items-center gap-2 mt-1"><Phone className="w-3.5 h-3.5 text-text-muted" dir="ltr" /> <span dir="ltr">{c.phone}</span></td>
                <td className="px-6 py-4 text-sm text-text-primary"><div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-text-muted" /> {c.email}</div></td>
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-text-muted">לא נמצאו קבלנים במאגר.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת קבלן חדש">
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
    </div>
  );
}
