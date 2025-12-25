/**
 * ContractDetail shared types
 */

import { Contract, ContractStatus, ContractAnalysis } from '../../types';
import { BlockchainAnchor, ContractParty, ShareLink, DocumentVersion } from '../../services/api';

export interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
  onViewDocument: () => void;
  onViewReport?: (analysis: ContractAnalysis) => void;
  onStartSign?: () => void;
}

export interface TimelineEvent {
  title: string;
  date: string;
  completed: boolean;
  notes?: string;
  documents?: string[];
}

export interface ContractData {
  contract: Contract | null;
  isLoading: boolean;
  error: string | null;
}

export interface BlockchainState {
  anchors: BlockchainAnchor[];
  isLoading: boolean;
  isAnchoring: boolean;
  error: string | null;
}

export interface VersionsState {
  versions: DocumentVersion[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

export interface PartiesState {
  parties: ContractParty[];
  isLoading: boolean;
  error: string | null;
}

export interface SharingState {
  shareLinks: ShareLink[];
  isLoading: boolean;
  error: string | null;
}

export interface TimelineState {
  events: TimelineEvent[];
  viewMode: 'LIST' | 'CALENDAR';
  currentMonth: Date;
  selectedDate: string | null;
  expandedEvent: number | null;
}

export { Contract, ContractStatus, BlockchainAnchor, ContractParty, ShareLink, DocumentVersion };
