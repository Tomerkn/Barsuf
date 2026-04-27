import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings as SettingsIcon, Menu, Moon, Sun } from 'lucide-react';

export function Header({ toggleMobileMenu }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode state
    if (document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
    
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
  };

  const handleBellClick = () => {
    alert("אין התראות חדשות נכון לעכשיו");
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
        <button 
          onClick={handleBellClick}
          className="relative p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-surface-hover"
          title="התראות"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
        </button>
        <div className="relative" ref={profileRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-surface-hover pr-3"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand)]/10 flex items-center justify-center text-[var(--color-brand)] font-bold">
              ת
            </div>
            <span className="text-sm font-medium hidden sm:block mr-2 text-text-primary">תומר קנובלר</span>
          </div>

          {isProfileOpen && (
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-surface border border-border py-1 z-50">
              <button className="w-full text-right px-4 py-2 text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2">
                <User className="w-4 h-4" />
                הפרופיל שלי
              </button>
              <button className="w-full text-right px-4 py-2 text-sm text-text-primary hover:bg-surface-hover flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                הגדרות
              </button>
              <div className="border-t border-border my-1"></div>
              <button className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
                <LogOut className="w-4 h-4" />
                התנתק
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
