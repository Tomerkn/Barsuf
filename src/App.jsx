import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Contractors } from './pages/Contractors';
import { Expenses } from './pages/Expenses';
import { Budget } from './pages/Budget';
import { Orders } from './pages/Orders';
import { Reports } from './pages/Reports';

function App() {
  // מצב ששומר האם תפריט הצד פתוח במסכים קטנים (כמו טלפונים)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Router>
      <div className="flex h-screen bg-background overflow-hidden text-text-primary" dir="rtl">
        {/* מעבירים את המצב של התפריט לקומפוננטת הצד */}
        <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
        
        {/* במסכים קטנים אין מרווח מימין, במסכים גדולים יש מרווח של 64 כדי לא להסתיר את תוכן העמוד */}
        <div className="flex-1 flex flex-col md:pr-64 h-full overflow-hidden w-full transition-all duration-300">
          <Header toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/contractors" element={<Contractors />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="*" element={<div className="p-8 text-center text-text-muted">עמוד בבנייה...</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
