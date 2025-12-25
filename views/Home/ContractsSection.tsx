/**
 * ContractsSection Component
 *
 * Active contracts list with filter chips.
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileQuestion } from 'lucide-react';
import { ListSkeleton } from '../../components/Skeleton';
import { Contract } from '../../types';
import { ContractCard } from './ContractCard';
import { FILTERS, FILTER_KEY_MAP } from './types';

interface ContractsSectionProps {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  onContractClick: (contract: Contract) => void;
}

export const ContractsSection: React.FC<ContractsSectionProps> = ({
  contracts,
  loading,
  error,
  onContractClick,
}) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState('all');

  const filteredContracts = useMemo(
    () => contracts.filter(c => filterType === 'all' || FILTER_KEY_MAP[c.type] === filterType),
    [contracts, filterType]
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">{t('home.activeContracts')}</h3>
      </div>

      {/* Filter Chips - minimum 44px touch target for accessibility */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2 -mx-2 px-2">
        {FILTERS.map(filterKey => (
          <button
            key={filterKey}
            onClick={() => setFilterType(filterKey)}
            data-testid={`filter-${filterKey}`}
            className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              filterType === filterKey
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {t(`filters.${filterKey}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <ListSkeleton count={3} />
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-red-200">
            <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm font-semibold">{t('errors.loadFailed')}</p>
            <p className="text-slate-400 text-xs mt-1">{error}</p>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center">
            <FileQuestion size={48} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">{t('home.noContracts')}</p>
            <p className="text-slate-400 text-xs mt-1">{t('home.noContractsDesc', 'Upload a contract to get started')}</p>
          </div>
        ) : (
          filteredContracts.map(contract => (
            <ContractCard key={contract.id} contract={contract} onClick={() => onContractClick(contract)} t={t} />
          ))
        )}
      </div>
    </div>
  );
};

export default ContractsSection;
