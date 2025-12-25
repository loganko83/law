/**
 * Bulk Export Service
 *
 * Exports multiple contracts to various formats (PDF, CSV, JSON).
 * Uses jspdf for PDF generation and native APIs for other formats.
 */

import { Contract, ContractAnalysis, RiskLevel } from '../types';
import { auditLog } from './auditLog';

export type ExportFormat = 'pdf' | 'csv' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeAnalysis?: boolean;
  includeTimeline?: boolean;
  fileName?: string;
}

export interface ExportProgress {
  current: number;
  total: number;
  status: 'preparing' | 'processing' | 'generating' | 'complete' | 'error';
  message: string;
}

type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Export multiple contracts
 */
export async function exportContracts(
  contracts: Contract[],
  options: ExportOptions,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const { format, includeAnalysis = true, includeTimeline = true } = options;

  onProgress?.({
    current: 0,
    total: contracts.length,
    status: 'preparing',
    message: 'Preparing export...',
  });

  auditLog.log('export_data', {
    details: {
      format,
      contractCount: contracts.length,
      includeAnalysis,
      includeTimeline,
    },
  });

  try {
    let result: Blob;

    switch (format) {
      case 'pdf':
        result = await exportToPdf(contracts, { includeAnalysis, includeTimeline }, onProgress);
        break;
      case 'csv':
        result = exportToCsv(contracts, { includeAnalysis });
        break;
      case 'json':
        result = exportToJson(contracts, { includeAnalysis, includeTimeline });
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    onProgress?.({
      current: contracts.length,
      total: contracts.length,
      status: 'complete',
      message: 'Export complete!',
    });

    return result;
  } catch (error) {
    onProgress?.({
      current: 0,
      total: contracts.length,
      status: 'error',
      message: error instanceof Error ? error.message : 'Export failed',
    });
    throw error;
  }
}

/**
 * Export to PDF format
 */
async function exportToPdf(
  contracts: Contract[],
  options: { includeAnalysis: boolean; includeTimeline: boolean },
  onProgress?: ProgressCallback
): Promise<Blob> {
  // Dynamically import jspdf to reduce initial bundle size
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Title page
  doc.setFontSize(24);
  doc.text('Contract Export Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleString('ko-KR')}`, pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 10;
  doc.text(`Total Contracts: ${contracts.length}`, pageWidth / 2, yPosition, { align: 'center' });

  // Process each contract
  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];

    onProgress?.({
      current: i + 1,
      total: contracts.length,
      status: 'processing',
      message: `Processing contract ${i + 1} of ${contracts.length}...`,
    });

    // New page for each contract
    doc.addPage();
    yPosition = margin;

    // Contract header
    doc.setFontSize(18);
    doc.text(contract.title, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID: ${contract.id}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Type: ${contract.type}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Status: ${contract.status}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Date: ${contract.date}`, margin, yPosition);
    yPosition += 6;
    doc.text(`Party: ${contract.partyName}`, margin, yPosition);
    yPosition += 15;

    doc.setTextColor(0);

    // Contract content preview
    if (contract.content) {
      doc.setFontSize(12);
      doc.text('Content Preview:', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      const contentPreview = contract.content.substring(0, 500) + '...';
      const lines = doc.splitTextToSize(contentPreview, pageWidth - margin * 2);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * 5 + 10;
    }

    // Analysis section
    if (options.includeAnalysis && contract.analysis) {
      yPosition = addAnalysisSection(doc, contract.analysis, margin, yPosition, pageWidth);
    }

    // Timeline section
    if (options.includeTimeline && contract.timeline && contract.timeline.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      doc.text('Timeline:', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      for (const event of contract.timeline) {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = margin;
        }
        const status = event.completed ? '[Done]' : '[Pending]';
        doc.text(`${event.date} - ${status} ${event.title}`, margin + 5, yPosition);
        yPosition += 5;
        if (event.notes) {
          doc.setTextColor(100);
          doc.text(`  Note: ${event.notes}`, margin + 10, yPosition);
          doc.setTextColor(0);
          yPosition += 5;
        }
      }
    }
  }

  onProgress?.({
    current: contracts.length,
    total: contracts.length,
    status: 'generating',
    message: 'Generating PDF...',
  });

  return doc.output('blob');
}

/**
 * Add analysis section to PDF
 */
function addAnalysisSection(
  doc: import('jspdf').jsPDF,
  analysis: ContractAnalysis,
  margin: number,
  yPosition: number,
  pageWidth: number
): number {
  if (yPosition > 220) {
    doc.addPage();
    yPosition = margin;
  }

  doc.setFontSize(12);
  doc.text('AI Analysis:', margin, yPosition);
  yPosition += 8;

  // Safety score
  doc.setFontSize(10);
  doc.text(`Safety Score: ${analysis.score}/100`, margin + 5, yPosition);
  yPosition += 8;

  // Summary
  if (analysis.summary) {
    const summaryLines = doc.splitTextToSize(analysis.summary, pageWidth - margin * 2 - 10);
    doc.text(summaryLines, margin + 5, yPosition);
    yPosition += summaryLines.length * 5 + 5;
  }

  // Risks
  if (analysis.risks && analysis.risks.length > 0) {
    doc.text('Identified Risks:', margin + 5, yPosition);
    yPosition += 6;

    for (const risk of analysis.risks) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
      }

      const levelColor = getRiskColor(risk.level);
      doc.setTextColor(levelColor.r, levelColor.g, levelColor.b);
      doc.text(`[${risk.level}] ${risk.title}`, margin + 10, yPosition);
      doc.setTextColor(0);
      yPosition += 5;

      if (risk.description) {
        doc.setFontSize(9);
        const descLines = doc.splitTextToSize(risk.description, pageWidth - margin * 2 - 20);
        doc.text(descLines, margin + 15, yPosition);
        yPosition += descLines.length * 4 + 3;
        doc.setFontSize(10);
      }
    }
  }

  return yPosition + 10;
}

/**
 * Get color for risk level
 */
function getRiskColor(level: RiskLevel): { r: number; g: number; b: number } {
  switch (level) {
    case RiskLevel.High:
      return { r: 220, g: 38, b: 38 }; // Red
    case RiskLevel.Medium:
      return { r: 234, g: 179, b: 8 }; // Yellow/Orange
    case RiskLevel.Low:
      return { r: 34, g: 197, b: 94 }; // Green
    default:
      return { r: 0, g: 0, b: 0 };
  }
}

/**
 * Export to CSV format
 */
function exportToCsv(
  contracts: Contract[],
  options: { includeAnalysis: boolean }
): Blob {
  const headers = [
    'ID',
    'Title',
    'Type',
    'Status',
    'Date',
    'Party Name',
    ...(options.includeAnalysis ? ['Safety Score', 'Risk Count', 'Summary'] : []),
  ];

  const rows = contracts.map((contract) => {
    const baseRow = [
      contract.id,
      escapeCSV(contract.title),
      contract.type,
      contract.status,
      contract.date,
      escapeCSV(contract.partyName),
    ];

    if (options.includeAnalysis && contract.analysis) {
      baseRow.push(
        String(contract.analysis.score),
        String(contract.analysis.risks?.length || 0),
        escapeCSV(contract.analysis.summary || '')
      );
    } else if (options.includeAnalysis) {
      baseRow.push('', '', '');
    }

    return baseRow.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export to JSON format
 */
function exportToJson(
  contracts: Contract[],
  options: { includeAnalysis: boolean; includeTimeline: boolean }
): Blob {
  const exportData = contracts.map((contract) => {
    const base: Record<string, unknown> = {
      id: contract.id,
      title: contract.title,
      type: contract.type,
      status: contract.status,
      date: contract.date,
      partyName: contract.partyName,
    };

    if (options.includeAnalysis && contract.analysis) {
      base.analysis = contract.analysis;
    }

    if (options.includeTimeline && contract.timeline) {
      base.timeline = contract.timeline;
    }

    return base;
  });

  const jsonContent = JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      contractCount: contracts.length,
      contracts: exportData,
    },
    null,
    2
  );

  return new Blob([jsonContent], { type: 'application/json' });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get file extension for format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'pdf':
      return '.pdf';
    case 'csv':
      return '.csv';
    case 'json':
      return '.json';
    default:
      return '.txt';
  }
}

/**
 * Generate default file name
 */
export function generateFileName(format: ExportFormat, prefix: string = 'contracts'): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${date}${getFileExtension(format)}`;
}
