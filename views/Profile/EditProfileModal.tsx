/**
 * EditProfileModal Component
 * Modal for editing profile and RAG context
 */

import React from 'react';
import { X, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserProfile } from './types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  editForm: UserProfile;
  setEditForm: React.Dispatch<React.SetStateAction<UserProfile>>;
  onSave: () => void;
  isSaving?: boolean;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  editForm,
  setEditForm,
  onSave,
  isSaving = false,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 id="edit-profile-title" className="font-bold text-lg text-slate-800">
                {t('profile.editInfo')}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-2">
                {t('profile.basicInfo')}
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.nameLabel')}
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.emailLabel')}
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.phoneLabel')}
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                  placeholder={t('profile.phonePlaceholder')}
                />
              </div>

              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-2 mt-6 flex items-center gap-1">
                <Database size={12} /> {t('profile.aiKnowledgeBaseDna')}
              </h4>
              <div className="bg-indigo-50 p-3 rounded-lg mb-2 text-[10px] text-indigo-700 leading-relaxed">
                {t('profile.aiContextDescription')}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.industryJobLabel')}
                </label>
                <input
                  type="text"
                  value={editForm.businessType}
                  onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value })}
                  placeholder={t('profile.industryJobPlaceholder')}
                  className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.businessDescriptionInputLabel')}
                </label>
                <textarea
                  value={editForm.businessDescription}
                  onChange={(e) => setEditForm({ ...editForm, businessDescription: e.target.value })}
                  placeholder={t('profile.businessDescriptionInputPlaceholder')}
                  className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('profile.legalConcernsInputLabel')}
                </label>
                <textarea
                  value={editForm.legalConcerns}
                  onChange={(e) => setEditForm({ ...editForm, legalConcerns: e.target.value })}
                  placeholder={t('profile.legalConcernsInputPlaceholder')}
                  className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none h-20 resize-none"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200 disabled:opacity-50"
                >
                  {isSaving ? t('common.saving') : t('profile.saveAndUpdateAi')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
