/**
 * ScanningView Component
 *
 * Displays the scanning/analysis animation while processing.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScanningViewProps {
  analysisProgress: string;
  estimatedTime: string | null;
  error: string | null;
  onRetry: () => void;
}

export const ScanningView: React.FC<ScanningViewProps> = ({
  analysisProgress,
  estimatedTime,
  error,
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-blue-500/10 z-0"
      />

      {/* Scanning Effect */}
      <div className="relative w-64 h-80 border-2 border-blue-500/50 rounded-2xl overflow-hidden mb-8 z-10 bg-slate-800/50 backdrop-blur">
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText size={64} className="text-slate-600" />
        </div>
        <motion.div
          className="absolute top-0 left-0 right-0 h-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className="text-xs text-blue-300 font-mono">{analysisProgress || t('upload.processing')}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2 z-10">{t('upload.analyzing')}</h2>
      <p className="text-slate-400 text-center z-10 max-w-xs">
        {analysisProgress || t('upload.analyzingDescription')}
      </p>
      {estimatedTime && (
        <p className="text-blue-400/70 text-sm text-center z-10 mt-2 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
          {estimatedTime}
        </p>
      )}

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 z-10 max-w-sm">
          <p className="text-red-300 text-sm text-center">{error}</p>
          <button
            onClick={onRetry}
            className="mt-2 w-full py-2 bg-red-500/30 rounded-lg text-red-200 text-sm hover:bg-red-500/40"
          >
            {t('upload.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ScanningView;
