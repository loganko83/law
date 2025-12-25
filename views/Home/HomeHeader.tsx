/**
 * HomeHeader Component
 *
 * Header with app title, language switcher, and notifications dropdown.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { Bell, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Notification } from './types';

interface HomeHeaderProps {
  notifications: Notification[];
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ notifications }) => {
  const { t } = useTranslation();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="flex justify-between items-center pt-2 relative z-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('app.name')}</h1>
        <p className="text-sm text-slate-500">{t('app.tagline')}</p>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher compact />
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          data-testid="btn-notifications"
          aria-label={t('notifications.title')}
          aria-expanded={showNotifications}
          aria-haspopup="true"
          className={`p-3 min-w-[44px] min-h-[44px] rounded-full border shadow-sm relative transition-colors flex items-center justify-center ${showNotifications ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
        >
          <Bell size={20} className={showNotifications ? 'text-blue-600' : 'text-slate-600'} aria-hidden="true" />
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-label="unread notifications"></span>
        </button>
      </div>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
          >
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs font-bold text-slate-600">{t('notifications.title')}</span>
              <button onClick={() => setShowNotifications(false)} aria-label={t('common.close')} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 rounded-lg">
                <X size={16} className="text-slate-400" aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`w-2 h-2 rounded-full mt-1.5 ${n.read ? 'bg-slate-300' : 'bg-blue-500'}`}></span>
                    <span className="text-[10px] text-slate-400 ml-2">{n.time}</span>
                  </div>
                  <p className="text-xs text-slate-700 pl-4 leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default HomeHeader;
