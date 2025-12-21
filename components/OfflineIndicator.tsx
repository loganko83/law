import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isOnline, onOnlineStatusChange } from '../services/registerSW';

export const OfflineIndicator: React.FC = () => {
  const [online, setOnline] = useState(isOnline());
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const unsubscribe = onOnlineStatusChange((status) => {
      if (status && !online) {
        // Just came back online
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
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
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 dark:bg-amber-600 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <WifiOff size={18} />
          <span className="text-sm font-medium">You are offline</span>
        </motion.div>
      )}
      {showReconnected && online && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-green-500 dark:bg-green-600 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <Wifi size={18} />
          <span className="text-sm font-medium">Back online</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
