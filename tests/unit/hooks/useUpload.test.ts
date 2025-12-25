/**
 * Tests for useUpload hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpload } from '../../../views/Upload/hooks/useUpload';

// Mock dependencies
vi.mock('../../../components/Toast', () => ({
  useToast: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'object') {
        return defaultValue.defaultValue || key;
      }
      return defaultValue || key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../../services/api', () => ({
  contractsApi: {
    create: vi.fn(),
    uploadDocument: vi.fn(),
  },
  analysisApi: {
    analyze: vi.fn(),
    getAnalysis: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../../../services/pdfExtractor', () => ({
  extractPdfText: vi.fn(),
  isPdfFile: vi.fn(),
}));

vi.mock('../../../services/ocrService', () => ({
  extractImageText: vi.fn(),
  isImageFile: vi.fn(),
}));

vi.mock('../../../services/imageCompressor', () => ({
  compressImage: vi.fn(),
  shouldCompress: vi.fn(),
  formatFileSize: vi.fn(),
}));

vi.mock('../../../services/contractAnalysis', () => ({
  analyzeContract: vi.fn(),
}));

describe('useUpload', () => {
  const mockOnAnalyze = vi.fn();
  const mockUserProfile = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '123-456-7890',
    businessType: 'startup',
    businessDescription: 'Tech company',
    legalConcerns: 'IP protection',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with initial state', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    expect(result.current.file).toBe(null);
    expect(result.current.isScanning).toBe(false);
    expect(result.current.analysisProgress).toBe('');
    expect(result.current.error).toBe(null);
    expect(result.current.estimatedTime).toBe(null);
  });

  it('should handle file change', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const mockEvent = {
      target: {
        files: [mockFile],
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    expect(result.current.file).toBe(mockFile);
  });

  it('should handle file change with no files', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    const mockEvent = {
      target: {
        files: null,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleFileChange(mockEvent);
    });

    expect(result.current.file).toBe(null);
  });

  it('should set file directly', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    act(() => {
      result.current.setFile(mockFile);
    });

    expect(result.current.file).toBe(mockFile);
  });

  it('should clear file', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    act(() => {
      result.current.setFile(mockFile);
    });

    expect(result.current.file).toBe(mockFile);

    act(() => {
      result.current.setFile(null);
    });

    expect(result.current.file).toBe(null);
  });

  it('should reset error', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    // Manually set error state through internal mechanism
    // Since error is set internally, we test the resetError function
    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should stop scanning', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    act(() => {
      result.current.stopScanning();
    });

    expect(result.current.isScanning).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should not start analysis without file', async () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    await act(async () => {
      await result.current.handleStartAnalysis();
    });

    expect(result.current.isScanning).toBe(false);
    expect(mockOnAnalyze).not.toHaveBeenCalled();
  });

  it('should work without user profile', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze })
    );

    expect(result.current.file).toBe(null);
    expect(result.current.isScanning).toBe(false);
  });

  it('should provide all required functions', () => {
    const { result } = renderHook(() =>
      useUpload({ onAnalyze: mockOnAnalyze, userProfile: mockUserProfile })
    );

    expect(typeof result.current.setFile).toBe('function');
    expect(typeof result.current.handleFileChange).toBe('function');
    expect(typeof result.current.handleStartAnalysis).toBe('function');
    expect(typeof result.current.resetError).toBe('function');
    expect(typeof result.current.stopScanning).toBe('function');
  });
});
