/**
 * useWebSocket Hook
 *
 * React hook for subscribing to WebSocket events with automatic
 * cleanup on unmount.
 */
import { useEffect, useCallback, useState } from 'react';
import {
  websocketService,
  WebSocketMessage,
  ContractUpdatePayload,
  NotificationPayload,
  AnalysisCompletePayload,
} from '../services/websocket';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  useEffect(() => {
    if (autoConnect) {
      websocketService.connect().catch(console.error);
    }

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(websocketService.isConnected());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [autoConnect]);

  const connect = useCallback(() => {
    return websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const send = useCallback((message: Omit<WebSocketMessage, 'timestamp'>) => {
    websocketService.send(message);
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    send,
  };
}

/**
 * Subscribe to contract updates
 */
export function useContractUpdates(
  onUpdate: (payload: ContractUpdatePayload) => void,
  contractId?: string
) {
  useEffect(() => {
    const unsubscribe = websocketService.subscribe('contract_update', (message) => {
      const payload = message.payload as ContractUpdatePayload;
      if (!contractId || payload.contractId === contractId) {
        onUpdate(payload);
      }
    });

    return unsubscribe;
  }, [onUpdate, contractId]);
}

/**
 * Subscribe to notifications
 */
export function useNotifications(
  onNotification: (payload: NotificationPayload) => void
) {
  useEffect(() => {
    const unsubscribe = websocketService.subscribe('notification', (message) => {
      onNotification(message.payload as NotificationPayload);
    });

    return unsubscribe;
  }, [onNotification]);
}

/**
 * Subscribe to analysis completion events
 */
export function useAnalysisComplete(
  onComplete: (payload: AnalysisCompletePayload) => void,
  analysisId?: string
) {
  useEffect(() => {
    const unsubscribe = websocketService.subscribe('analysis_complete', (message) => {
      const payload = message.payload as AnalysisCompletePayload;
      if (!analysisId || payload.analysisId === analysisId) {
        onComplete(payload);
      }
    });

    return unsubscribe;
  }, [onComplete, analysisId]);
}
