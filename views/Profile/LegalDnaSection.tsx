/**
 * LegalDnaSection Component
 * RAG Context / My Legal DNA section
 */

import React from 'react';
import { Brain, Database, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserProfile } from './types';

interface LegalDnaSectionProps {
  userProfile: UserProfile;
  onEditProfile: () => void;
}

export const LegalDnaSection: React.FC<LegalDnaSectionProps> = ({
  userProfile,
  onEditProfile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-lg shadow-indigo-50 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Brain size={80} className="text-indigo-600" />
      </div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-indigo-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <Database size={12} /> {t('profile.aiKnowledgeBase')}
          </p>
          <h3 className="text-xl font-bold text-slate-800">{t('profile.legalDna')}</h3>
        </div>
        <button
          onClick={onEditProfile}
          className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
        >
          {t('profile.updateInfo')}
        </button>
      </div>
      <div className="space-y-3 relative z-10">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.industryJob')}</p>
          <p className="text-sm font-semibold text-slate-800">{userProfile.businessType || t('profile.notEntered')}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.businessDescriptionLabel')}</p>
          <p className="text-sm text-slate-600 line-clamp-2">{userProfile.businessDescription || t('profile.businessDescriptionPlaceholder')}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.legalConcernsLabel')}</p>
          <p className="text-sm text-slate-600 line-clamp-2">{userProfile.legalConcerns || t('profile.legalConcernsPlaceholder')}</p>
        </div>
      </div>
      <p className="text-[10px] text-indigo-400 mt-3 flex items-center gap-1">
        <Check size={10} /> {t('profile.aiAutoApply')}
      </p>
    </div>
  );
};
