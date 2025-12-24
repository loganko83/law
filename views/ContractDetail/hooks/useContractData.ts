/**
 * useContractData Hook
 * Fetches and manages all contract-related data in parallel
 */

import { useState, useEffect } from 'react';
import { useToast } from '../../../components/Toast';
import {
  contractsApi,
  blockchainApi,
  partiesApi,
  sharingApi,
  versionsApi,
  ApiError,
  BlockchainAnchor,
  ContractParty,
  ShareLink,
  DocumentVersion,
} from '../../../services/api';
import { Contract } from '../../../types';
import { TimelineEvent } from '../types';

export interface UseContractDataResult {
  freshContract: Contract | null;
  events: TimelineEvent[];
  setEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
  isLoading: boolean;
  error: string | null;
  blockchainAnchors: BlockchainAnchor[];
  setBlockchainAnchors: React.Dispatch<React.SetStateAction<BlockchainAnchor[]>>;
  isLoadingAnchors: boolean;
  anchorError: string | null;
  parties: ContractParty[];
  setParties: React.Dispatch<React.SetStateAction<ContractParty[]>>;
  isLoadingParties: boolean;
  partiesError: string | null;
  shareLinks: ShareLink[];
  setShareLinks: React.Dispatch<React.SetStateAction<ShareLink[]>>;
  isLoadingShares: boolean;
  sharingError: string | null;
  versions: DocumentVersion[];
  setVersions: React.Dispatch<React.SetStateAction<DocumentVersion[]>>;
  isLoadingVersions: boolean;
  versionsError: string | null;
}

export function useContractData(contract: Contract): UseContractDataResult {
  const toast = useToast();

  // Contract state
  const [freshContract, setFreshContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>((contract as any).timeline || []);

  // Blockchain state
  const [blockchainAnchors, setBlockchainAnchors] = useState<BlockchainAnchor[]>([]);
  const [isLoadingAnchors, setIsLoadingAnchors] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  // Parties state
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  // Sharing state
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);

  // Versions state
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllContractData = async () => {
      if (!contract.id) return;

      // Set all loading states
      if (!freshContract) setIsLoading(true);
      setIsLoadingAnchors(true);
      setIsLoadingParties(true);
      setIsLoadingShares(true);
      setIsLoadingVersions(true);

      // Clear previous errors
      setError(null);
      setAnchorError(null);
      setPartiesError(null);
      setSharingError(null);
      setVersionsError(null);

      // Fetch all data in parallel
      const [
        contractResult,
        anchorsResult,
        partiesResult,
        sharesResult,
        versionsResult,
      ] = await Promise.allSettled([
        freshContract ? Promise.resolve(null) : contractsApi.get(contract.id),
        blockchainApi.getContractAnchors(contract.id),
        partiesApi.getContractParties(contract.id),
        sharingApi.getMyLinks(contract.id),
        versionsApi.getVersionHistory(contract.id),
      ]);

      // Process contract details result
      if (contractResult.status === 'fulfilled' && contractResult.value) {
        setFreshContract(contractResult.value as any);
        if ((contractResult.value as any).timeline) {
          setEvents((contractResult.value as any).timeline);
        }
      } else if (contractResult.status === 'rejected') {
        const errorMessage = contractResult.reason instanceof ApiError
          ? contractResult.reason.message
          : 'Failed to fetch contract details';
        setError(errorMessage);
        console.error('Error fetching contract details:', contractResult.reason);
        toast.error(errorMessage);
      }
      setIsLoading(false);

      // Process blockchain anchors result
      if (anchorsResult.status === 'fulfilled') {
        setBlockchainAnchors(anchorsResult.value);
      } else {
        const errorMessage = anchorsResult.reason instanceof ApiError
          ? anchorsResult.reason.message
          : 'Failed to fetch blockchain anchors';
        setAnchorError(errorMessage);
        console.error('Error fetching blockchain anchors:', anchorsResult.reason);
      }
      setIsLoadingAnchors(false);

      // Process parties result
      if (partiesResult.status === 'fulfilled') {
        setParties(partiesResult.value);
      } else {
        const errorMessage = partiesResult.reason instanceof ApiError
          ? partiesResult.reason.message
          : 'Failed to fetch parties';
        setPartiesError(errorMessage);
        console.error('Error fetching parties:', partiesResult.reason);
      }
      setIsLoadingParties(false);

      // Process share links result
      if (sharesResult.status === 'fulfilled') {
        setShareLinks(sharesResult.value);
      } else {
        const errorMessage = sharesResult.reason instanceof ApiError
          ? sharesResult.reason.message
          : 'Failed to fetch share links';
        setSharingError(errorMessage);
        console.error('Error fetching share links:', sharesResult.reason);
      }
      setIsLoadingShares(false);

      // Process versions result
      if (versionsResult.status === 'fulfilled') {
        setVersions(versionsResult.value);
      } else {
        const errorMessage = versionsResult.reason instanceof ApiError
          ? versionsResult.reason.message
          : 'Failed to fetch version history';
        setVersionsError(errorMessage);
        console.error('Error fetching versions:', versionsResult.reason);
      }
      setIsLoadingVersions(false);
    };

    fetchAllContractData();
  }, [contract.id]);

  return {
    freshContract,
    events,
    setEvents,
    isLoading,
    error,
    blockchainAnchors,
    setBlockchainAnchors,
    isLoadingAnchors,
    anchorError,
    parties,
    setParties,
    isLoadingParties,
    partiesError,
    shareLinks,
    setShareLinks,
    isLoadingShares,
    sharingError,
    versions,
    setVersions,
    isLoadingVersions,
    versionsError,
  };
}
