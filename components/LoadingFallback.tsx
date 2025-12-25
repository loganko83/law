/**
 * Loading Fallback Component
 *
 * Displays a loading state while lazy-loaded components are being fetched.
 * Used with React.Suspense for code splitting.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LoadingFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message,
  fullScreen = false
}) => {
  const { t } = useTranslation();

  const containerClass = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-50'
    : 'flex items-center justify-center min-h-[200px] p-8';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        {/* Loading spinner */}
        <motion.div
          className="relative w-12 h-12"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 dark:border-t-indigo-400" />
        </motion.div>

        {/* Loading message */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {message || t('common.loading', 'Loading...')}
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;
