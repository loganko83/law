/**
 * useOfflineQueue Hook
 * React hook for interacting with the offline queue service
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, QueuedAction, ActionType } from '../services/offlineQueue';

interface UseOfflineQueueResult {
  queue: QueuedAction[];
  pendingCount: number;
  hasPendingActions: boolean;
  isOnline: boolean;
  addToQueue: (type: ActionType, payload: unknown) => QueuedAction;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  retryFailed: () => Promise<void>;
  processQueue: () => Promise<void>;
}

export function useOfflineQueue(): UseOfflineQueueResult {
  const [queue, setQueue] = useState<QueuedAction[]>(offlineQueue.getQueue());
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe(setQueue);

    // Subscribe to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = useCallback((type: ActionType, payload: unknown) => {
    return offlineQueue.add(type, payload);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    offlineQueue.remove(id);
  }, []);

  const clearQueue = useCallback(() => {
    offlineQueue.clear();
  }, []);

  const retryFailed = useCallback(async () => {
    await offlineQueue.retryFailed();
  }, []);

  const processQueue = useCallback(async () => {
    await offlineQueue.processQueue();
  }, []);

  return {
    queue,
    pendingCount: queue.filter(a => a.status === 'pending').length,
    hasPendingActions: queue.some(a => a.status === 'pending' || a.status === 'failed'),
    isOnline,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryFailed,
    processQueue,
  };
}

export default useOfflineQueue;
