/**
 * DID Hook
 *
 * Provides DID management functionality for the SafeCon application.
 */

import { useState, useCallback } from "react";
import { didApi, UserDID, ApiError } from "../services/api";

interface DIDState {
  didStatus: UserDID | null;
  isLoading: boolean;
  error: string | null;
}

interface DIDActions {
  issueDID: () => Promise<void>;
  checkStatus: () => Promise<void>;
  verifyDID: (didAddress: string) => Promise<boolean>;
  revokeDID: (reason?: string) => Promise<void>;
}

export function useDID(): DIDState & DIDActions {
  const [didStatus, setDidStatus] = useState<UserDID | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issueDID = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await didApi.issue();
      setDidStatus({
        did_address: result.did_address,
        status: "pending",
        tx_hash: null,
        confirmed_at: null,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "DID issuance failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await didApi.getStatus();
      setDidStatus(status);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // User doesn't have a DID yet
        setDidStatus(null);
      } else {
        const message = err instanceof ApiError ? err.message : "Failed to check DID status";
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyDID = useCallback(async (didAddress: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await didApi.verify(didAddress);
      return result.valid;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "DID verification failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeDID = useCallback(async (reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await didApi.revoke(reason);
      setDidStatus((prev) =>
        prev ? { ...prev, status: "revoked" } : null
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "DID revocation failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    didStatus,
    isLoading,
    error,
    issueDID,
    checkStatus,
    verifyDID,
    revokeDID,
  };
}

export default useDID;
