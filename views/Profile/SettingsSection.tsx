/**
 * SettingsSection Component
 * Display settings and menu items
 */

import React from 'react';
import { User, CreditCard, Settings, LogOut, LogIn, Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { MenuItem } from './MenuItem';

interface SettingsSectionProps {
  isAuthenticated: boolean;
  onEditProfile: () => void;
  onNavigateToBilling?: () => void;
  onNavigateToDevPortal?: () => void;
  onLogout: () => void;
  onLogin?: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  isAuthenticated,
  onEditProfile,
  onNavigateToBilling,
  onNavigateToDevPortal,
  onLogout,
  onLogin,
}) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  return (
    <>
      {/* Display Settings */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {resolvedTheme === 'dark' ? (
              <Moon size={18} className="text-indigo-500" />
            ) : (
              <Sun size={18} className="text-amber-500" />
            )}
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {t('profile.displaySettings')}
            </h3>
          </div>
        </div>
        <ThemeToggle variant="select" />
      </div>

      {/* Settings Menu */}
      <div className="space-y-2 pt-2">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2 px-1">
          {t('profile.accountSettings')}
        </h3>
        <MenuItem
          icon={<User size={18} />}
          label={t('profile.editPersonalInfo')}
          onClick={onEditProfile}
        />
        <MenuItem
          icon={<CreditCard size={18} />}
          label={t('billing.title')}
          onClick={onNavigateToBilling}
        />
        {isAuthenticated && (
          <MenuItem
            icon={<Settings size={18} />}
            label={t('devPortal.title')}
            onClick={onNavigateToDevPortal}
          />
        )}
        <MenuItem icon={<Settings size={18} />} label={t('profile.appSettings')} />
      </div>

      {/* Auth Button */}
      <div className="pt-4 space-y-3">
        {isAuthenticated ? (
          <button
            onClick={onLogout}
            className="w-full py-3.5 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} /> {t('profile.logout')}
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="w-full py-3.5 text-blue-600 font-semibold text-sm flex items-center justify-center gap-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <LogIn size={18} /> {t('auth.login')}
          </button>
        )}
      </div>
    </>
  );
};
