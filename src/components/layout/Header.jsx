import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings as SettingsIcon, Menu, Moon, Sun, AlertTriangle, AlertCircle, Clock, Package, Wrench, FileText, DollarSign } from 'lucide-react';
import { api } from '../../services/api';

const CATEGORY_ICONS = {
  tasks:    <Clock className="w-3.5 h-3.5" />,
  budget:   <DollarSign className="w-3.5 h-3.5" />,
  warranty: <Wrench className="w-3.5 h-3.5" />,
  projects: <AlertCircle className="w-3.5 h-3.5" />,
  orders:   <Package className="w-3.5 h-3.5" />,
  logs:     <FileText className="w-3.5 h-3.5" />,
};

const CATEGORY_LABELS = {
  tasks:    'משימות',
  budget:   'תקציב',
  warranty: 'אחריות',
  projects: 'פרויקטים',
  orders:   'הזמנות',
  logs:     'יומן עבודה',
};

export function Header({ toggleMobileMenu, profile, onLogout }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [newAlertPing, setNewAlertPing] = useState(false);
  const alertsRef = useRef(null);
  const prevCountRef = useRef(0);

  const fetchAlerts = async () => {
    try {
      const data = await api.getSystemNotifications();
      setAlerts(data);
      // אם יש התראות חדשות — עשה ping
      if (data.length > prevCountRef.current) {
        setNewAlertPing(true);
        setTimeout(() => setNewAlertPing(false), 2000);
      }
      prevCountRef.current = data.length;
    } catch (e) {
      console.error('Error fetching alerts', e);
    }
  };

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) setIsDarkMode(true);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000);

    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
    }
    function handleClickOutsideAlert(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) setIsAlertOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mousedown", handleClickOutsideAlert);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mousedown", handleClickOutsideAlert);
    };
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const dangerCount  = alerts.filter(a => a.type === 'danger').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="חיפוש פרויקט, קבלן, הוצאה..."
            className="w-full bg-surface border border-border rounded-lg py-2 pr-10 pl-4 text-sm text-text-primary focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleDarkMode}
          className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-surface-hover"
          title="החלף מצב תצוגה"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* ─── פאנל התראות ─── */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setIsAlertOpen(!isAlertOpen)}
            className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-surface-hover cursor-pointer"
            title="התראות"
          >
            <Bell className={`w-5 h-5 ${alerts.length > 0 ? 'text-amber-500' : ''} ${newAlertPing ? 'animate-bounce' : ''}`} />
            {alerts.length > 0 && (
              <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] ${dangerCount > 0 ? 'bg-red-500' : 'bg-amber-500'} text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-background px-0.5 ${newAlertPing ? 'animate-ping' : ''}`}>
                {alerts.length}
              </span>
            )}
          </button>

          {isAlertOpen && (
            <div
              className="absolute left-0 mt-2 w-96 max-h-[480px] overflow-y-auto rounded-2xl shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 z-50 text-right"
              dir="rtl"
              style={{ animation: 'slideDown 0.18s ease' }}
            >
              {/* כותרת */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-l from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-t-2xl flex justify-between items-center">
                <div>
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">התראות מערכת</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">מתעדכן כל 20 שניות</p>
                </div>
                <div className="flex gap-2">
                  {dangerCount > 0 && (
                    <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {dangerCount} דחוף
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {warningCount} אזהרה
                    </span>
                  )}
                </div>
              </div>

              {/* רשימת התראות */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {alerts.length > 0 ? (
                  alerts.map(alert => (
                    <a
                      key={alert.id}
                      href={`/projects/${alert.projectId}`}
                      className={`block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-right group ${alert.type === 'danger' ? 'border-r-[3px] border-red-500' : 'border-r-[3px] border-amber-400'}`}
                      onClick={() => setIsAlertOpen(false)}
                    >
                      <div className="flex items-start gap-3">
                        {/* אייקון קטגוריה */}
                        <span className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${alert.type === 'danger' ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'}`}>
                          {CATEGORY_ICONS[alert.category] || <Bell className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h6 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">{alert.title}</h6>
                            <span className={`text-[9px] flex-shrink-0 px-1.5 py-0.5 rounded-full font-medium ${alert.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
                              {CATEGORY_LABELS[alert.category] || ''}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{alert.message}</p>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="py-10 text-center">
                    <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">אין התראות</p>
                    <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">לוח הזמנים תקין 👍</p>
                  </div>
                )}
              </div>

              {/* footer */}
              {alerts.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                  <button
                    onClick={fetchAlerts}
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    רענן עכשיו
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── פרופיל ─── */}
        <div className="relative" ref={profileRef}>
          <div
            className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-surface-hover pr-3 transition-colors"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="w-8 h-8 rounded-full border border-border overflow-hidden">
              <img src={profile?.avatar} alt={profile?.name} className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:flex flex-col items-start mr-1">
              <span className="text-xs font-bold text-text-primary leading-none mb-0.5">{profile?.name}</span>
              <span className="text-[10px] text-brand font-medium leading-none">{profile?.role}</span>
            </div>
          </div>

          {isProfileOpen && (
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-surface border border-border py-1 z-50">
              <div className="px-4 py-2 border-b border-border sm:hidden">
                <p className="text-sm font-bold text-text-primary">{profile?.name}</p>
                <p className="text-[10px] text-brand">{profile?.role}</p>
              </div>
              <button className="w-full text-right px-4 py-2 text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors">
                <User className="w-4 h-4 text-text-muted" />
                הפרופיל שלי
              </button>
              <button className="w-full text-right px-4 py-2 text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2 transition-colors">
                <SettingsIcon className="w-4 h-4 text-text-muted" />
                הגדרות
              </button>
              <div className="border-t border-border my-1"></div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLogout(); }}
                className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>החלף פרופיל / התנתק</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
