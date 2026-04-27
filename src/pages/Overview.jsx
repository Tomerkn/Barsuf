import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { KpiCard } from '../components/ui/KpiCard';
import { Briefcase, Wallet, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Overview() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const pList = await api.getProjects();
        setProjects(pList);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  const activeProjectsCount = projects.length;
  // Placeholder metrics since we don't fetch all global analytics yet.
  // In a real app, we'd have an endpoint for global analytics.
  const projectsWithAlerts = projects.filter(p => p.status !== 'תקין').length;
  const healthyProjects = activeProjectsCount - projectsWithAlerts;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">דאשבורד מנהל</h1>
        <p className="text-text-secondary text-sm">מבט על על כלל הפרויקטים בחברה</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="סה״כ פרויקטים" 
          value={activeProjectsCount.toString()} 
          icon={<Briefcase className="w-5 h-5" />} 
        />
        <KpiCard 
          title="פרויקטים בתקינות" 
          value={healthyProjects.toString()} 
          icon={<CheckCircle className="w-5 h-5 text-green-500" />} 
        />
        <KpiCard 
          title="דורשים התערבות (חריגות)" 
          value={projectsWithAlerts.toString()} 
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />} 
          trend={projectsWithAlerts > 0 ? "שים לב!" : ""}
        />
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">סטטוס פרויקטים פעילים</h2>
        </div>
        <div className="divide-y divide-border">
          {projects.map(project => (
            <div key={project.id} className="p-6 flex items-center justify-between hover:bg-surface-hover transition-colors">
              <div>
                <Link to={`/projects/${project.id}`} className="text-lg font-bold text-text-primary hover:text-[var(--color-brand)] transition-colors">
                  {project.name}
                </Link>
                <p className="text-sm text-text-secondary mt-1">{project.location}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${project.status === 'תקין' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-red-500/10 text-red-600'}`}>
                  {project.status}
                </span>
                <Link to={`/projects/${project.id}`} className="bg-background border border-border px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface transition-colors">
                  כניסה לפרויקט
                </Link>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="p-8 text-center text-text-muted">אין פרויקטים פעילים במערכת.</div>
          )}
        </div>
      </div>
    </div>
  );
}
