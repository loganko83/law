import React, { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { isOnline, onOnlineStatusChange } from '../services/registerSW';
import { useOfflineQueue } from '../hooks';

export const OfflineIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [online, setOnline] = useState(isOnline());
  const [showReconnected, setShowReconnected] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pendingCount, queue, retryFailed } = useOfflineQueue();

  const failedCount = queue.filter(a => a.status === 'failed').length;

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onOnlineStatusChange((status) => {
      if (status && !online) {
        // Just came back online
        setShowReconnected(true);
        // Clear any existing timeout before setting a new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setShowReconnected(false), 3000);
      }
      setOnline(status);
    });

    return unsubscribe;
  }, [online]);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 dark:bg-amber-600 text-white py-2 px-4 shadow-lg"
        >
          <div className="max-w-md mx-auto flex items-center justify-center gap-2">
            <WifiOff size={18} />
            <div className="text-center">
              <span className="text-sm font-medium">
                {t('offline.youAreOffline', 'You are offline')}
              </span>
              {pendingCount > 0 && (
                <span className="text-xs ml-2 opacity-90">
                  ({t('offline.pendingCount', { count: pendingCount, defaultValue: `${pendingCount} pending` })})
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
      {showReconnected && online && failedCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 dark:bg-green-600 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <Wifi size={18} />
          <span className="text-sm font-medium">
            {t('offline.backOnline', 'Back online')}
          </span>
        </motion.div>
      )}
      {online && failedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-red-500 dark:bg-red-600 text-white py-2 px-4 shadow-lg"
        >
          <div className="max-w-md mx-auto flex items-center justify-center gap-3">
            <AlertCircle size={18} />
            <span className="text-sm font-medium">
              {t('offline.syncFailed', { count: failedCount, defaultValue: `${failedCount} action(s) failed to sync` })}
            </span>
            <button
              onClick={retryFailed}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label={t('common.retry', 'Retry')}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
