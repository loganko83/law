/**
 * useHealthCheck Hook
 * React hook for monitoring service health
 */

import { useState, useEffect, useCallback } from 'react';
import { healthCheckService, HealthCheckResult } from '../services/healthCheck';

interface UseHealthCheckOptions {
  autoStart?: boolean;
  checkInterval?: number;
}

interface UseHealthCheckResult {
  status: HealthCheckResult | null;
  isLoading: boolean;
  checkNow: () => Promise<void>;
}

export function useHealthCheck(options: UseHealthCheckOptions = {}): UseHealthCheckResult {
  const { autoStart = false, checkInterval = 60000 } = options;
  const [status, setStatus] = useState<HealthCheckResult | null>(healthCheckService.getLastResult());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = healthCheckService.subscribe(setStatus);

    if (autoStart) {
      healthCheckService.startPeriodicChecks(checkInterval);
    }

    return () => {
      unsubscribe();
      if (autoStart) {
        healthCheckService.stopPeriodicChecks();
      }
    };
  }, [autoStart, checkInterval]);

  const checkNow = useCallback(async () => {
    setIsLoading(true);
    try {
      await healthCheckService.checkAll();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { status, isLoading, checkNow };
}

export default useHealthCheck;
