/**
 * Tests for useContracts hook
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ContractStatus } from '../../../types';

// Create mock function
const mockListFn = vi.fn();

// Mock the API module BEFORE importing the hook
vi.mock('../../../services/api', () => ({
  contractsApi: {
    list: () => mockListFn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Import hook AFTER mocks are set up
import { useContracts } from '../../../views/Home/hooks/useContracts';

describe('useContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: empty array
    mockListFn.mockResolvedValue([]);
  });

  it('should start with loading state', async () => {
    // Never resolving promise to keep loading state
    mockListFn.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useContracts());

    expect(result.current.loading).toBe(true);
    expect(result.current.contracts).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should fetch and transform contracts successfully', async () => {
    const mockApiContracts = [
      {
        id: '1',
        title: 'Test Contract',
        contract_type: 'Service',
        created_at: '2024-01-15T10:00:00Z',
        status: 'active',
        description: 'Test Description',
      },
      {
        id: '2',
        title: 'Draft Contract',
        contract_type: 'Freelance',
        created_at: '2024-01-16T10:00:00Z',
        status: 'draft',
        description: null,
      },
    ];

    mockListFn.mockResolvedValue(mockApiContracts);

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contracts).toHaveLength(2);
    expect(result.current.contracts[0].id).toBe('1');
    expect(result.current.contracts[0].title).toBe('Test Contract');
    expect(result.current.contracts[0].status).toBe(ContractStatus.Active);
    expect(result.current.contracts[1].status).toBe(ContractStatus.Draft);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors', async () => {
    mockListFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.contracts).toEqual([]);
  });

  it('should filter active contracts correctly', async () => {
    const mockApiContracts = [
      { id: '1', title: 'Active', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'active', description: '' },
      { id: '2', title: 'Completed', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'expired', description: '' },
      { id: '3', title: 'Pending', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'pending', description: '' },
    ];

    mockListFn.mockResolvedValue(mockApiContracts);

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // activeContracts should exclude completed contracts
    expect(result.current.activeContracts).toHaveLength(2);
    expect(result.current.activeContracts.find(c => c.title === 'Completed')).toBeUndefined();
  });

  it('should filter contracts by type correctly', async () => {
    const mockApiContracts = [
      { id: '1', title: 'Service 1', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'active', description: '' },
      { id: '2', title: 'Freelance 1', contract_type: 'Freelance', created_at: '2024-01-15T10:00:00Z', status: 'active', description: '' },
      { id: '3', title: 'Rental 1', contract_type: 'Rental', created_at: '2024-01-15T10:00:00Z', status: 'active', description: '' },
    ];

    mockListFn.mockResolvedValue(mockApiContracts);

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Filter by 'all' should return all contracts
    const allFiltered = result.current.getFilteredContracts('all');
    expect(allFiltered).toHaveLength(3);

    // Filter by 'service' should return only service contracts
    const serviceFiltered = result.current.getFilteredContracts('service');
    expect(serviceFiltered).toHaveLength(1);
    expect(serviceFiltered[0].title).toBe('Service 1');

    // Filter by 'freelance' should return only freelance contracts
    const freelanceFiltered = result.current.getFilteredContracts('freelance');
    expect(freelanceFiltered).toHaveLength(1);
    expect(freelanceFiltered[0].title).toBe('Freelance 1');
  });

  it('should map API statuses correctly', async () => {
    const mockApiContracts = [
      { id: '1', title: 'Draft', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'draft', description: '' },
      { id: '2', title: 'Pending', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'pending', description: '' },
      { id: '3', title: 'Active', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'active', description: '' },
      { id: '4', title: 'Expired', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'expired', description: '' },
      { id: '5', title: 'Terminated', contract_type: 'Service', created_at: '2024-01-15T10:00:00Z', status: 'terminated', description: '' },
    ];

    mockListFn.mockResolvedValue(mockApiContracts);

    const { result } = renderHook(() => useContracts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.contracts[0].status).toBe(ContractStatus.Draft);
    expect(result.current.contracts[1].status).toBe(ContractStatus.Reviewing);
    expect(result.current.contracts[2].status).toBe(ContractStatus.Active);
    expect(result.current.contracts[3].status).toBe(ContractStatus.Completed);
    expect(result.current.contracts[4].status).toBe(ContractStatus.Completed);
  });
});
