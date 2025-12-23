
export enum ContractStatus {
  Draft = 'DRAFT',
  Reviewing = 'REVIEWING',
  Active = 'ACTIVE',
  Completed = 'COMPLETED',
  Dispute = 'DISPUTE'
}

export enum RiskLevel {
  Low = 'LOW',
  Medium = 'MEDIUM',
  High = 'HIGH'
}

export interface RiskPoint {
  id: string;
  title: string;
  description: string;
  level: RiskLevel;
}

export interface ContractAnalysis {
  summary: string;
  risks: RiskPoint[];
  questions: string[];
  score: number;
}

export interface TimelineEvent {
  date: string;
  title: string;
  completed: boolean;
  documents?: string[];
  notes?: string;
}

export interface Contract {
  id: string;
  title: string;
  type: 'Freelance' | 'Rental' | 'Employment' | 'Service' | 'Sales' | 'Business' | 'Investment';
  partyName: string;
  status: ContractStatus;
  date: string;
  content?: string;
  analysis?: ContractAnalysis;
  timeline?: TimelineEvent[];
}

// RAG Context Data Structure
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  // Context for AI
  businessType: string; // e.g., "Freelance Developer", "Cafe Owner"
  businessDescription: string; // e.g., "I build React web apps for startups."
  legalConcerns: string; // e.g., "Payment delays, IP theft"
}

export type ViewState =
  | 'HOME'
  | 'UPLOAD'
  | 'ANALYSIS_LOADING'
  | 'REPORT'
  | 'DETAIL'
  | 'DOCUMENT'
  | 'TEMPLATE_PREVIEW'
  | 'PROFILE'
  | 'LEGAL_SERVICES'
  | 'CONTENT_PROOF'
  | 'LEGAL_QA'
  | 'DOCUSIGN_SIGNING'
  | 'LOGIN'
  | 'REGISTER'
  | 'VERIFY'
  | 'BILLING'
  | 'DEVELOPER_PORTAL';
