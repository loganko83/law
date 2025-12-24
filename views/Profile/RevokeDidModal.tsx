/**
 * RevokeDidModal Component
 * Confirmation modal for revoking DID
 */

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface RevokeDidModalProps {
  isOpen: boolean;
  onClose: () => void;
  revokeReason: string;
  setRevokeReason: (reason: string) => void;
  onConfirm: () => void;
}

export const RevokeDidModal: React.FC<RevokeDidModalProps> = ({
  isOpen,
  onClose,
  revokeReason,
  setRevokeReason,
  onConfirm,
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
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="revoke-did-title"
            aria-describedby="revoke-did-desc"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 id="revoke-did-title" className="font-bold text-lg text-slate-800">
                {t('did.revokeConfirmTitle')}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p id="revoke-did-desc" className="text-sm text-red-700">
                  {t('did.revokeWarning')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {t('did.revokeReasonLabel')}
                </label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder={t('did.revokeReasonPlaceholder')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-red-500 outline-none h-24 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertCircle size={18} /> {t('did.confirmRevoke')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
