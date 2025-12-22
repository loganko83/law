/**
 * Signatures Hook
 *
 * Provides contract signature functionality with W3C VC support.
 */

import { useState, useCallback } from "react";
import { signaturesApi, ContractSignature, ApiError } from "../services/api";

interface SignaturesState {
  signatures: ContractSignature[];
  currentSignature: ContractSignature | null;
  signingStatus: {
    all_parties_signed: boolean;
    total_parties: number;
    signed_count: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

interface SignaturesActions {
  signContract: (
    contractId: string,
    signatureType: "draw" | "type" | "image",
    documentHash: string,
    signatureData?: string
  ) => Promise<ContractSignature>;
  getContractSignatures: (contractId: string) => Promise<void>;
  getSignature: (signatureId: string) => Promise<void>;
  verifySignature: (signatureId: string) => Promise<boolean>;
  revokeSignature: (signatureId: string, reason?: string) => Promise<void>;
}

export function useSignatures(): SignaturesState & SignaturesActions {
  const [signatures, setSignatures] = useState<ContractSignature[]>([]);
  const [currentSignature, setCurrentSignature] = useState<ContractSignature | null>(null);
  const [signingStatus, setSigningStatus] = useState<SignaturesState["signingStatus"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signContract = useCallback(async (
    contractId: string,
    signatureType: "draw" | "type" | "image",
    documentHash: string,
    signatureData?: string
  ): Promise<ContractSignature> => {
    setIsLoading(true);
    setError(null);

    try {
      const signature = await signaturesApi.sign({
        contract_id: contractId,
        signature_type: signatureType,
        signature_data: signatureData,
        document_hash: documentHash,
      });
      setCurrentSignature(signature);
      setSignatures((prev) => [...prev, signature]);
      return signature;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Signing failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getContractSignatures = useCallback(async (contractId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signaturesApi.getContractSignatures(contractId);
      setSignatures(result.signatures);
      setSigningStatus({
        all_parties_signed: result.all_parties_signed,
        total_parties: result.total_parties,
        signed_count: result.signed_count,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load signatures";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSignature = useCallback(async (signatureId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const signature = await signaturesApi.get(signatureId);
      setCurrentSignature(signature);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load signature";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifySignature = useCallback(async (signatureId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signaturesApi.verify(signatureId);
      return result.valid;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Verification failed";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const revokeSignature = useCallback(async (signatureId: string, reason?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await signaturesApi.revoke(signatureId, reason);
      setSignatures((prev) =>
        prev.map((s) =>
          s.id === signatureId ? { ...s, status: "revoked" } : s
        )
      );
      if (currentSignature?.id === signatureId) {
        setCurrentSignature((prev) => prev ? { ...prev, status: "revoked" } : null);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Revocation failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentSignature?.id]);

  return {
    signatures,
    currentSignature,
    signingStatus,
    isLoading,
    error,
    signContract,
    getContractSignatures,
    getSignature,
    verifySignature,
    revokeSignature,
  };
}

export default useSignatures;
