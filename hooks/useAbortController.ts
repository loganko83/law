/**
 * useAbortController Hook
 * Provides AbortController management for canceling fetch requests on unmount
 */

import { useRef, useEffect, useCallback } from 'react';

interface AbortControllerManager {
  getSignal: () => AbortSignal;
  abort: () => void;
  reset: () => void;
}

/**
 * Hook to manage AbortController for canceling API requests
 * Automatically aborts pending requests when component unmounts
 */
export function useAbortController(): AbortControllerManager {
  const controllerRef = useRef<AbortController | null>(null);

  // Create a new controller if none exists
  const ensureController = useCallback(() => {
    if (!controllerRef.current || controllerRef.current.signal.aborted) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current;
  }, []);

  // Get the current signal
  const getSignal = useCallback(() => {
    return ensureController().signal;
  }, [ensureController]);

  // Abort the current request
  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  // Reset the controller (create a new one)
  const reset = useCallback(() => {
    abort();
    controllerRef.current = new AbortController();
  }, [abort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { getSignal, abort, reset };
}

/**
 * Hook to track multiple named abort controllers
 * Useful when a component makes multiple independent API calls
 */
export function useMultipleAbortControllers(): {
  getSignal: (key: string) => AbortSignal;
  abort: (key: string) => void;
  abortAll: () => void;
  reset: (key: string) => void;
} {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const getSignal = useCallback((key: string) => {
    let controller = controllersRef.current.get(key);
    if (!controller || controller.signal.aborted) {
      controller = new AbortController();
      controllersRef.current.set(key, controller);
    }
    return controller.signal;
  }, []);

  const abort = useCallback((key: string) => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      controller.abort();
    }
  }, []);

  const abortAll = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
  }, []);

  const reset = useCallback((key: string) => {
    abort(key);
    controllersRef.current.set(key, new AbortController());
  }, [abort]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortAll();
    };
  }, [abortAll]);

  return { getSignal, abort, abortAll, reset };
}

/**
 * Check if an error is an AbortError
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export default useAbortController;
