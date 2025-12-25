/**
 * ContractCard Component
 *
 * Individual contract card with status, type, and details.
 */
import React from 'react';
import { Card } from '../../components/Card';
import { ChevronRight, Clock } from 'lucide-react';
import { Contract, ContractStatus } from '../../types';

interface ContractCardProps {
  contract: Contract;
  onClick: () => void;
  t: (key: string) => string;
}

const getStatusColor = (status: ContractStatus): string => {
  switch (status) {
    case ContractStatus.Reviewing:
      return 'bg-orange-100 text-orange-700';
    case ContractStatus.Active:
      return 'bg-green-100 text-green-700';
    case ContractStatus.Dispute:
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getStatusKey = (status: ContractStatus): string => {
  switch (status) {
    case ContractStatus.Reviewing:
      return 'reviewing';
    case ContractStatus.Active:
      return 'active';
    case ContractStatus.Dispute:
      return 'dispute';
    case ContractStatus.Completed:
      return 'completed';
    default:
      return 'draft';
  }
};

const getTypeKey = (type: string): string => {
  const typeMap: Record<string, string> = {
    'Freelance': 'freelance',
    'Rental': 'rental',
    'Employment': 'employment',
    'Service': 'service',
    'Business': 'business',
    'Investment': 'investment'
  };
  return typeMap[type] || 'service';
};

export const ContractCard: React.FC<ContractCardProps> = ({ contract, onClick, t }) => {
  return (
    <Card onClick={onClick} className="flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
          <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(contract.status)}`}>
            {t(`status.${getStatusKey(contract.status)}`)}
          </div>
          <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
            {t(`filters.${getTypeKey(contract.type)}`)}
          </div>
        </div>
        <span className="text-xs text-slate-400">{contract.date}</span>
      </div>
      <div>
        <h4 className="font-bold text-slate-800">{contract.title}</h4>
        <p className="text-sm text-slate-500 mt-1">{contract.partyName}</p>
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={14} />
          <span>{t('contract.next')}: {t('contract.schedule')}</span>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Card>
  );
};

export default ContractCard;
