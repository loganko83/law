/**
 * useVersions Hook
 * Manages version history operations
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/Toast';
import { versionsApi, ApiError, DocumentVersion } from '../../../services/api';

export interface UseVersionsResult {
  isUploading: boolean;
  isReverting: boolean;
  isRevertModalOpen: boolean;
  selectedVersion: DocumentVersion | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleUploadVersion: (file: File) => Promise<void>;
  handleRevertClick: (version: DocumentVersion) => void;
  handleRevertConfirm: () => Promise<void>;
  handleDownloadVersion: (versionId: string) => Promise<void>;
  closeRevertModal: () => void;
  formatFileSize: (bytes: number) => string;
}

export function useVersions(
  contractId: string,
  versions: DocumentVersion[],
  setVersions: React.Dispatch<React.SetStateAction<DocumentVersion[]>>
): UseVersionsResult {
  const { t } = useTranslation();
  const toast = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadVersion = useCallback(async (file: File) => {
    if (!contractId) return;

    setIsUploading(true);

    try {
      const newVersion = await versionsApi.uploadVersion(contractId, file);
      setVersions([newVersion, ...versions]);
      toast.success(t('versions.uploadSuccess'));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.uploadError');
      toast.error(errorMessage);
      console.error('Error uploading version:', err);
    } finally {
      setIsUploading(false);
    }
  }, [contractId, versions, setVersions, t, toast]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadVersion(file);
    }
  }, [handleUploadVersion]);

  const handleRevertClick = useCallback((version: DocumentVersion) => {
    setSelectedVersion(version);
    setIsRevertModalOpen(true);
  }, []);

  const handleRevertConfirm = useCallback(async () => {
    if (!contractId || !selectedVersion) return;

    setIsReverting(true);

    try {
      const result = await versionsApi.revertToVersion(contractId, selectedVersion.version);
      setVersions([result.new_current_version, ...versions]);
      toast.success(t('versions.revertSuccess'));
      setIsRevertModalOpen(false);
      setSelectedVersion(null);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.revertError');
      toast.error(errorMessage);
      console.error('Error reverting version:', err);
    } finally {
      setIsReverting(false);
    }
  }, [contractId, selectedVersion, versions, setVersions, t, toast]);

  const handleDownloadVersion = useCallback(async (versionId: string) => {
    try {
      await versionsApi.downloadVersion(versionId);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.downloadError');
      toast.error(errorMessage);
      console.error('Error downloading version:', err);
    }
  }, [t, toast]);

  const closeRevertModal = useCallback(() => {
    setIsRevertModalOpen(false);
    setSelectedVersion(null);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  return {
    isUploading,
    isReverting,
    isRevertModalOpen,
    selectedVersion,
    fileInputRef,
    handleFileSelect,
    handleUploadVersion,
    handleRevertClick,
    handleRevertConfirm,
    handleDownloadVersion,
    closeRevertModal,
    formatFileSize,
  };
}
