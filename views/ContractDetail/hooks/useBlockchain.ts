/**
 * useBlockchain Hook
 * Manages blockchain anchoring operations
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/Toast';
import { blockchainApi, ApiError, BlockchainAnchor } from '../../../services/api';

export interface UseBlockchainResult {
  isAnchoring: boolean;
  anchorError: string | null;
  handleAnchorToBlockchain: () => Promise<void>;
  handleDownloadCertificate: (anchorId: string) => Promise<void>;
  getExplorerUrl: (txHash: string) => string;
  truncateHash: (hash: string, length?: number) => string;
}

export function useBlockchain(
  contractId: string,
  blockchainAnchors: BlockchainAnchor[],
  setBlockchainAnchors: React.Dispatch<React.SetStateAction<BlockchainAnchor[]>>
): UseBlockchainResult {
  const { t } = useTranslation();
  const toast = useToast();

  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const handleAnchorToBlockchain = useCallback(async () => {
    if (!contractId) return;

    setIsAnchoring(true);
    setAnchorError(null);

    try {
      const documentHash = `hash_${contractId}_${Date.now()}`;
      const anchor = await blockchainApi.anchor({
        contract_id: contractId,
        document_hash: documentHash,
      });

      setBlockchainAnchors([...blockchainAnchors, anchor]);
      toast.success(t('blockchain.anchorSuccess'));
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to anchor to blockchain';
      setAnchorError(errorMessage);
      toast.error(errorMessage);
      console.error('Error anchoring to blockchain:', err);
    } finally {
      setIsAnchoring(false);
    }
  }, [contractId, blockchainAnchors, setBlockchainAnchors, t, toast]);

  const handleDownloadCertificate = useCallback(async (anchorId: string) => {
    try {
      const certificate = await blockchainApi.getCertificate(anchorId);

      if (certificate.pdf_url) {
        window.open(certificate.pdf_url, '_blank');
      } else {
        toast.info(t('blockchain.certificateGenerating'));
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to download certificate';
      toast.error(errorMessage);
      console.error('Error downloading certificate:', err);
    }
  }, [t, toast]);

  const getExplorerUrl = useCallback((txHash: string) => {
    return `https://explorer.xphere.io/tx/${txHash}`;
  }, []);

  const truncateHash = useCallback((hash: string, length: number = 8) => {
    if (!hash) return '';
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  }, []);

  return {
    isAnchoring,
    anchorError,
    handleAnchorToBlockchain,
    handleDownloadCertificate,
    getExplorerUrl,
    truncateHash,
  };
}
