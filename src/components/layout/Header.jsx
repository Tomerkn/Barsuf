import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings as SettingsIcon, Menu, Moon, Sun } from 'lucide-react';
import { api } from '../../services/api';

export function Header({ toggleMobileMenu, profile, onLogout }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // הגדרות והוקס עבור מערכת התראות בזמן אמת
  const [alerts, setAlerts] = useState([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const alertsRef = useRef(null);

  const fetchAlerts = async () => {
    try {
      const data = await api.getSystemNotifications();
      setAlerts(data);
    } catch (e) {
      console.error('Error fetching alerts', e);
    }
  };

  useEffect(() => {
    // Check initial dark mode state
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
    
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 20000); // רענון התראות כל 20 שניות
    
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    
    function handleClickOutsideAlert(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertOpen(false);
      }
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

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* כפתור תפריט המבורגר (מופיע רק במסכים קטנים) כדי לפתוח את תפריט הצד */}
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
          title="החלף מצב תצוגה (Dark/Light Mode)"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="relative" ref={alertsRef}>
          <button 
            onClick={() => setIsAlertOpen(!isAlertOpen)}
            className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-surface-hover cursor-pointer"
            title="התראות"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[15px] h-[15px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-background px-0.5">
                {alerts.length}
              </span>
            )}
          </button>

          {isAlertOpen && (
            <div className="absolute left-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg bg-surface border border-border py-1 z-50 text-right custom-scrollbar" dir="rtl">
              <div className="px-4 py-2.5 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">התראות מערכת ועיכובי WBS</span>
                <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                  {alerts.length} משימות בעיכוב
                </span>
              </div>
              <div className="divide-y divide-border">
                {alerts.length > 0 ? (
                  alerts.map(alert => (
                    <a
                      key={alert.id}
                      href={`/projects/${alert.projectId}/monday`}
                      className="block p-3 hover:bg-surface-hover transition-colors text-right"
                      onClick={() => setIsAlertOpen(false)}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${alert.type === 'danger' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div className="space-y-1">
                          <h6 className="text-xs font-bold text-slate-800 dark:text-slate-100">{alert.title}</h6>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-text-muted italic">
                    אין התראות חדשות. לוח הזמנים תקין!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLogout();
                }}
                className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors font-medium cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>החלף פרופיל / התנתק</span>
              </button>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}

