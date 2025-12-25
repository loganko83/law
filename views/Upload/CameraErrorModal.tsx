/**
 * CameraErrorModal Component
 *
 * Displays camera access errors with troubleshooting guidance.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CameraOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CameraError } from './types';

interface CameraErrorModalProps {
  cameraError: CameraError | null;
  onClose: () => void;
  onRetry: () => void;
}

export const CameraErrorModal: React.FC<CameraErrorModalProps> = ({
  cameraError,
  onClose,
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {cameraError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="camera-error-title"
            aria-describedby="camera-error-desc"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <CameraOff size={32} className="text-red-500" />
              </div>
              <h3 id="camera-error-title" className="font-bold text-lg text-slate-800 mb-2">
                {t('upload.cameraErrorTitle', 'Camera Access Issue')}
              </h3>
              <p id="camera-error-desc" className="text-sm text-slate-600 mb-4">
                {cameraError.message}
              </p>

              {cameraError.type === 'permission' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-left w-full">
                  <p className="text-xs font-bold text-blue-800 mb-2">
                    {t('upload.cameraPermissionGuide', 'How to enable camera access:')}
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>{t('upload.cameraStep1', 'Tap the lock icon in your browser address bar')}</li>
                    <li>{t('upload.cameraStep2', 'Find "Camera" in the permissions list')}</li>
                    <li>{t('upload.cameraStep3', 'Change the setting to "Allow"')}</li>
                    <li>{t('upload.cameraStep4', 'Refresh this page and try again')}</li>
                  </ol>
                </div>
              )}

              {cameraError.type === 'inUse' && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 text-left w-full">
                  <p className="text-xs text-orange-700">
                    {t('upload.cameraInUseGuide', 'Please close other apps using the camera (video calls, camera app) and try again.')}
                  </p>
                </div>
              )}

              <div className="flex gap-2 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  {t('common.close', 'Close')}
                </button>
                <button
                  onClick={onRetry}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  {t('upload.tryAgain', 'Try Again')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CameraErrorModal;
