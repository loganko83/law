/**
 * ProfileHeader Component
 * Profile header with avatar, name, and stats
 */

import React from 'react';
import { User, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserProfile, HISTORY_CONTRACTS } from './types';

interface ProfileHeaderProps {
  userProfile: UserProfile;
  onEditProfile: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userProfile,
  onEditProfile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm border-b border-slate-100 flex flex-col items-center relative">
      <div className="relative mb-4">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-blue-600 border-4 border-white shadow-lg">
          <User size={40} />
        </div>
        <button
          onClick={onEditProfile}
          className="absolute bottom-1 right-0 bg-slate-800 text-white p-2 rounded-full border-2 border-white shadow-md hover:bg-slate-700 transition-colors"
        >
          <Edit2 size={14} />
        </button>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-1">{userProfile.name}</h2>
      <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
        <span>{userProfile.email}</span>
        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
        <span>{userProfile.phone}</span>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {t('profile.joinDate')}
          </span>
          <span className="text-sm font-semibold text-slate-700">2023.01.15</span>
        </div>
        <div className="flex-1 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-100">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
            {t('profile.totalContracts')}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            {t('profile.contractsCount', { count: HISTORY_CONTRACTS.length })}
          </span>
        </div>
      </div>
    </div>
  );
};
