/**
 * Home View Types
 */
import { Contract, ContractStatus } from '../../types';

export interface HomeProps {
  onContractClick: (contract: Contract) => void;
  onNewCheck: () => void;
  onTemplateClick?: (templateId: string) => void;
}

export interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

export interface Template {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

export interface ExternalLink {
  titleKey: string;
  url: string;
  descKey: string;
}

export const FILTER_KEY_MAP: Record<string, string> = {
  'all': 'all',
  'Freelance': 'freelance',
  'Rental': 'rental',
  'Employment': 'employment',
  'Service': 'service',
  'Sales': 'service',
  'Business': 'business',
  'Investment': 'investment'
};

export const FILTERS = ['all', 'freelance', 'rental', 'employment', 'service', 'business', 'investment'];

export const TEMPLATE_CATEGORIES = ['all', 'standard', 'investment', 'business', 'realEstate', 'employment'];
