import React from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Scale, PlusCircle, User } from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50 relative max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col">
      {/* Header - Conditional based on view could be added here */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50 pb-8">
        <NavButton
          icon={<Home size={24} />}
          label={t('nav.home')}
          active={currentView === 'HOME'}
          onClick={() => onChangeView('HOME')}
        />
        <NavButton
          icon={<PlusCircle size={24} />}
          label={t('nav.diagnosis')}
          active={currentView === 'UPLOAD' || currentView === 'ANALYSIS_LOADING' || currentView === 'REPORT'}
          onClick={() => onChangeView('UPLOAD')}
          primary
        />
        <NavButton
          icon={<Scale size={24} />}
          label={t('nav.legalServices')}
          active={currentView === 'LEGAL_SERVICES' || currentView === 'CONTENT_PROOF' || currentView === 'LEGAL_QA'}
          onClick={() => onChangeView('LEGAL_SERVICES')}
        />
        <NavButton
          icon={<User size={24} />}
          label={t('nav.profile')}
          active={currentView === 'PROFILE'}
          onClick={() => onChangeView('PROFILE')}
        />
      </div>
    </div>
  );
};

const NavButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  primary?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, primary, onClick }) => {
  if (primary) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center -mt-8"
      >
        <div className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-200 transition-transform active:scale-95">
          {icon}
        </div>
        <span className="text-xs font-medium text-blue-600 mt-1">{label}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
};