/**
 * useBulkExport Hook
 *
 * React hook for exporting multiple contracts with progress tracking.
 */
import { useState, useCallback } from 'react';
import { Contract } from '../types';
import {
  exportContracts,
  downloadBlob,
  generateFileName,
  ExportFormat,
  ExportOptions,
  ExportProgress,
} from '../services/bulkExport';

interface UseBulkExportOptions {
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useBulkExport(options: UseBulkExportOptions = {}) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const exportData = useCallback(
    async (contracts: Contract[], exportOptions: ExportOptions) => {
      if (contracts.length === 0) {
        setError(new Error('No contracts selected for export'));
        return;
      }

      setIsExporting(true);
      setError(null);
      setProgress({
        current: 0,
        total: contracts.length,
        status: 'preparing',
        message: 'Preparing export...',
      });

      try {
        const blob = await exportContracts(contracts, exportOptions, setProgress);

        const fileName =
          exportOptions.fileName || generateFileName(exportOptions.format);
        downloadBlob(blob, fileName);

        options.onComplete?.();
      } catch (err) {
        const exportError = err instanceof Error ? err : new Error('Export failed');
        setError(exportError);
        options.onError?.(exportError);
      } finally {
        setIsExporting(false);
      }
    },
    [options]
  );

  const exportToPdf = useCallback(
    (contracts: Contract[], fileName?: string) => {
      return exportData(contracts, {
        format: 'pdf',
        includeAnalysis: true,
        includeTimeline: true,
        fileName,
      });
    },
    [exportData]
  );

  const exportToCsv = useCallback(
    (contracts: Contract[], fileName?: string) => {
      return exportData(contracts, {
        format: 'csv',
        includeAnalysis: true,
        fileName,
      });
    },
    [exportData]
  );

  const exportToJson = useCallback(
    (contracts: Contract[], fileName?: string) => {
      return exportData(contracts, {
        format: 'json',
        includeAnalysis: true,
        includeTimeline: true,
        fileName,
      });
    },
    [exportData]
  );

  const reset = useCallback(() => {
    setIsExporting(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    isExporting,
    progress,
    error,
    exportData,
    exportToPdf,
    exportToCsv,
    exportToJson,
    reset,
  };
}

/**
 * Export format options for UI
 */
export const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Full report with analysis and timeline',
  },
  {
    value: 'csv',
    label: 'CSV',
    description: 'Spreadsheet format for data analysis',
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Machine-readable format for integration',
  },
];
