/**
 * Profile shared types
 */

import { Contract, UserProfile } from '../../types';
import { UserDID } from '../../services/api';

export interface ProfileProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onBack: () => void;
  onLogin?: () => void;
  onNavigateToBilling?: () => void;
  onNavigateToDevPortal?: () => void;
}

export interface SavedCard {
  id: string;
  name: string;
  number: string;
  color: string;
}

export interface NewCard {
  number: string;
  expiry: string;
  cvc: string;
  pwd: string;
}

export interface ContractCategory {
  id: string;
  label: string;
  count: number;
}

export type { UserProfile };
export type { UserDID };

// Mock History Data
export const HISTORY_CONTRACTS: Partial<Contract>[] = [
  { id: 'h1', title: '2022 연봉 계약서', type: 'Employment', date: '2022-01-05', partyName: '(주)이전회사' },
  { id: 'h2', title: '서초 오피스텔 전세 계약', type: 'Rental', date: '2021-08-15', partyName: '김임대' },
  { id: 'h3', title: '중고차 매매 계약서', type: 'Sales', date: '2020-05-20', partyName: '박차왕' },
  { id: 'h4', title: '2021 프리랜서 용역 계약', type: 'Freelance', date: '2021-02-10', partyName: '스타트업A' },
];
