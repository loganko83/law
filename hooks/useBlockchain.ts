/**
 * Blockchain Hook
 *
 * Provides blockchain anchoring functionality for the SafeCon application.
 */

import { useState, useCallback } from "react";
import { blockchainApi, BlockchainAnchor, Certificate, ApiError } from "../services/api";

interface BlockchainState {
  anchors: BlockchainAnchor[];
  currentAnchor: BlockchainAnchor | null;
  certificate: Certificate | null;
  stats: {
    total_anchors: number;
    confirmed_anchors: number;
    pending_anchors: number;
    total_certificates: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

interface BlockchainActions {
  anchorDocument: (contractId: string, documentHash: string, documentId?: string) => Promise<BlockchainAnchor>;
  checkAnchorStatus: (anchorId: string) => Promise<void>;
  verifyDocument: (documentHash: string) => Promise<boolean>;
  batchAnchor: (hashes: string[]) => Promise<string>;
  getCertificate: (anchorId: string) => Promise<void>;
  getContractAnchors: (contractId: string) => Promise<void>;
  loadStats: () => Promise<void>;
}

export function useBlockchain(): BlockchainState & BlockchainActions {
  const [anchors, setAnchors] = useState<BlockchainAnchor[]>([]);
  const [currentAnchor, setCurrentAnchor] = useState<BlockchainAnchor | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [stats, setStats] = useState<BlockchainState["stats"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorDocument = useCallback(async (
    contractId: string,
    documentHash: string,
    documentId?: string
  ): Promise<BlockchainAnchor> => {
    setIsLoading(true);
    setError(null);

    try {
      const anchor = await blockchainApi.anchor({
        contract_id: contractId,
        document_id: documentId,
        document_hash: documentHash,
      });
      setCurrentAnchor(anchor);
      setAnchors((prev) => [anchor, ...prev]);
      return anchor;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Anchoring failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAnchorStatus = useCallback(async (anchorId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await blockchainApi.getAnchorStatus(anchorId);
      setCurrentAnchor((prev) =>
        prev && prev.id === anchorId
          ? { ...prev, status: status.status as BlockchainAnchor["status"], tx_hash: status.tx_hash, block_number: status.block_number }
          : prev
      );

      // Update in anchors list
      setAnchors((prev) =>
        prev.map((a) =>
          a.id === anchorId
            ? { ...a, status: status.status as BlockchainAnchor["status"], tx_hash: status.tx_hash, block_number: status.block_number }
            : a
        )
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Status check failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyDocument = useCallback(async (documentHash: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await blockchainApi.verifyDocument(documentHash);
      return result.verified;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Verification failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const batchAnchor = useCallback(async (hashes: string[]): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await blockchainApi.batchAnchor(hashes);
      return result.batch_id;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Batch anchoring failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCertificate = useCallback(async (anchorId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const cert = await blockchainApi.getCertificate(anchorId);
      setCertificate(cert);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to get certificate";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getContractAnchors = useCallback(async (contractId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const contractAnchors = await blockchainApi.getContractAnchors(contractId);
      setAnchors(contractAnchors);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load anchors";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const blockchainStats = await blockchainApi.getStats();
      setStats(blockchainStats);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load stats";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    anchors,
    currentAnchor,
    certificate,
    stats,
    isLoading,
    error,
    anchorDocument,
    checkAnchorStatus,
    verifyDocument,
    batchAnchor,
    getCertificate,
    getContractAnchors,
    loadStats,
  };
}

export default useBlockchain;
