/**
 * useDid Hook
 * Manages DID (Decentralized Identity) state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/Toast';
import { didApi, UserDID } from '../../../services/api';

export interface UseDidResult {
  didStatus: UserDID | null;
  isLoadingDid: boolean;
  isIssuingDid: boolean;
  isRevokeModalOpen: boolean;
  revokeReason: string;
  setRevokeReason: (reason: string) => void;
  openRevokeModal: () => void;
  closeRevokeModal: () => void;
  handleIssueDid: () => Promise<void>;
  handleRevokeDid: () => Promise<void>;
  handleCopyDid: () => void;
  truncateDidAddress: (address: string) => string;
}

export function useDid(isAuthenticated: boolean): UseDidResult {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [didStatus, setDidStatus] = useState<UserDID | null>(null);
  const [isLoadingDid, setIsLoadingDid] = useState(false);
  const [isIssuingDid, setIsIssuingDid] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchDidStatus = useCallback(async () => {
    try {
      setIsLoadingDid(true);
      const status = await didApi.getStatus();
      setDidStatus(status);
    } catch (error) {
      console.error('Failed to fetch DID status:', error);
    } finally {
      setIsLoadingDid(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDidStatus();
    }
  }, [isAuthenticated, fetchDidStatus]);

  const handleIssueDid = useCallback(async () => {
    try {
      setIsIssuingDid(true);
      const result = await didApi.issue();
      addToast({
        message: result.message || t('did.issueSuccess'),
        type: 'success'
      });
      await fetchDidStatus();
    } catch (error: any) {
      console.error('Failed to issue DID:', error);
      addToast({
        message: error?.details?.detail || t('did.issueError'),
        type: 'error'
      });
    } finally {
      setIsIssuingDid(false);
    }
  }, [addToast, fetchDidStatus, t]);

  const handleRevokeDid = useCallback(async () => {
    try {
      const result = await didApi.revoke(revokeReason);
      addToast({
        message: result.message || t('did.revokeSuccess'),
        type: 'success'
      });
      setIsRevokeModalOpen(false);
      setRevokeReason('');
      await fetchDidStatus();
    } catch (error: any) {
      console.error('Failed to revoke DID:', error);
      addToast({
        message: error?.details?.detail || t('did.revokeError'),
        type: 'error'
      });
    }
  }, [addToast, fetchDidStatus, revokeReason, t]);

  const handleCopyDid = useCallback(() => {
    if (didStatus?.did_address) {
      navigator.clipboard.writeText(didStatus.did_address);
      addToast({
        message: t('did.copiedToClipboard'),
        type: 'success'
      });
    }
  }, [addToast, didStatus, t]);

  const truncateDidAddress = useCallback((address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  }, []);

  const openRevokeModal = useCallback(() => setIsRevokeModalOpen(true), []);
  const closeRevokeModal = useCallback(() => {
    setIsRevokeModalOpen(false);
    setRevokeReason('');
  }, []);

  return {
    didStatus,
    isLoadingDid,
    isIssuingDid,
    isRevokeModalOpen,
    revokeReason,
    setRevokeReason,
    openRevokeModal,
    closeRevokeModal,
    handleIssueDid,
    handleRevokeDid,
    handleCopyDid,
    truncateDidAddress,
  };
}
