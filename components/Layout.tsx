import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Scale, PlusCircle, User } from 'lucide-react';
import { ViewState } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col transition-colors">
      {/* Header with Theme Toggle */}
      <div className="absolute top-4 right-4 z-40">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex justify-around items-center z-50 pb-6 transition-colors" data-testid="bottom-nav">
        <NavButton
          icon={<Home size={22} />}
          label={t('nav.home')}
          active={currentView === 'HOME'}
          onClick={() => onChangeView('HOME')}
          testId="nav-home"
        />
        <NavButton
          icon={<PlusCircle size={22} />}
          label={t('nav.diagnosis')}
          active={currentView === 'UPLOAD' || currentView === 'ANALYSIS_LOADING' || currentView === 'REPORT'}
          onClick={() => onChangeView('UPLOAD')}
          primary
          testId="nav-diagnosis"
        />
        <NavButton
          icon={<Scale size={22} />}
          label={t('nav.legalServices')}
          active={currentView === 'LEGAL_SERVICES' || currentView === 'CONTENT_PROOF' || currentView === 'LEGAL_QA'}
          onClick={() => onChangeView('LEGAL_SERVICES')}
          testId="nav-legal"
        />
        <NavButton
          icon={<User size={22} />}
          label={t('nav.profile')}
          active={currentView === 'PROFILE'}
          onClick={() => onChangeView('PROFILE')}
          testId="nav-profile"
        />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  primary?: boolean;
  onClick: () => void;
  testId?: string;
}> = ({ icon, label, active, primary, onClick, testId }) => {
  if (primary) {
    return (
      <button
        onClick={onClick}
        data-testid={testId}
        className="flex flex-col items-center justify-center -mt-8 min-w-[56px]"
      >
        <div className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-200 dark:shadow-blue-900/30 transition-transform active:scale-95 min-w-[56px] min-h-[56px] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">{label}</span>
      </button>
    );
  }

  // Minimum 44x44px touch target for accessibility (WCAG 2.1 AA)
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] p-1 rounded-lg transition-colors ${active ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};