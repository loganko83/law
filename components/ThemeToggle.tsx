import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  variant?: 'button' | 'select';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'button', className = '' }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  if (variant === 'select') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            theme === 'light'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
          }`}
          aria-label="Light mode"
        >
          <Sun size={18} />
          <span className="text-sm font-medium">{i18n.language === 'ko' ? '라이트' : 'Light'}</span>
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            theme === 'dark'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
          }`}
          aria-label="Dark mode"
        >
          <Moon size={18} />
          <span className="text-sm font-medium">{i18n.language === 'ko' ? '다크' : 'Dark'}</span>
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            theme === 'system'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
          }`}
          aria-label="System theme"
        >
          <Monitor size={18} />
          <span className="text-sm font-medium">{i18n.language === 'ko' ? '시스템' : 'System'}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2.5 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center
        ${resolvedTheme === 'dark'
          ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        } ${className}`}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      data-testid="theme-toggle"
    >
      {resolvedTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default ThemeToggle;
