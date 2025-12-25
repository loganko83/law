/**
 * useContracts Hook
 *
 * Handles fetching and transforming contracts from the API.
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Contract, ContractStatus } from '../../../types';
import { contractsApi, Contract as ApiContract } from '../../../services/api';
import { FILTER_KEY_MAP } from '../types';

interface UseContractsReturn {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
  activeContracts: Contract[];
  getFilteredContracts: (filterType: string) => Contract[];
}

const mapApiStatusToContractStatus = (apiStatus: string): ContractStatus => {
  switch (apiStatus) {
    case 'draft':
      return ContractStatus.Draft;
    case 'pending':
      return ContractStatus.Reviewing;
    case 'active':
      return ContractStatus.Active;
    case 'expired':
    case 'terminated':
      return ContractStatus.Completed;
    default:
      return ContractStatus.Reviewing;
  }
};

export function useContracts(): UseContractsReturn {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiContracts = await contractsApi.list();

        const mappedContracts: Contract[] = apiContracts.map((apiContract: ApiContract) => ({
          id: apiContract.id,
          title: apiContract.title,
          type: apiContract.contract_type || 'Service',
          date: new Date(apiContract.created_at).toLocaleDateString('ko-KR'),
          status: mapApiStatusToContractStatus(apiContract.status),
          partyName: apiContract.description || t('contract.unknownParty'),
        }));

        setContracts(mappedContracts);
      } catch (err) {
        console.error('Failed to fetch contracts:', err);
        setError(err instanceof Error ? err.message : t('errors.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [t]);

  const activeContracts = useMemo(
    () => contracts.filter(c => c.status !== ContractStatus.Completed),
    [contracts]
  );

  const getFilteredContracts = (filterType: string): Contract[] => {
    return activeContracts.filter(c => filterType === 'all' || FILTER_KEY_MAP[c.type] === filterType);
  };

  return {
    contracts,
    loading,
    error,
    activeContracts,
    getFilteredContracts,
  };
}
