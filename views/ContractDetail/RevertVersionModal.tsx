/**
 * RevertVersionModal Component
 * Confirmation modal for reverting to a previous version
 */

import React from 'react';
import { X, AlertCircle, Loader, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DocumentVersion } from '../../services/api';

interface RevertVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVersion: DocumentVersion | null;
  isReverting: boolean;
  onConfirm: () => void;
  formatFileSize: (bytes: number) => string;
}

export const RevertVersionModal: React.FC<RevertVersionModalProps> = ({
  isOpen,
  onClose,
  selectedVersion,
  isReverting,
  onConfirm,
  formatFileSize,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && selectedVersion && (
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
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative z-10"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="revert-version-title"
            aria-describedby="revert-version-desc"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="revert-version-title" className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertCircle size={20} className="text-orange-600" />
                {t('versions.revertConfirm')}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p id="revert-version-desc" className="text-sm text-slate-700 mb-2">
                  {t('versions.revertWarning')}
                </p>
                <div className="bg-white rounded-lg p-3 mt-3">
                  <p className="text-xs text-slate-500 font-semibold mb-1">{t('versions.version')}</p>
                  <p className="text-sm font-bold text-slate-800">v{selectedVersion.version}</p>
                  <p className="text-xs text-slate-500 mt-2">{selectedVersion.file_name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatFileSize(selectedVersion.file_size)} - {new Date(selectedVersion.upload_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isReverting}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isReverting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      {t('versions.reverting')}
                    </>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      {t('versions.revert')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
