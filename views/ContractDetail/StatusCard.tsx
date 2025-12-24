/**
 * StatusCard Component
 * Shows contract status and primary action buttons
 */

import React from 'react';
import { PenTool, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';
import { Card } from '../../components/Card';
import { Contract, ContractStatus } from '../../types';

interface StatusCardProps {
  contract: Contract;
  onViewDocument: () => void;
  onViewReport?: (analysis: any) => void;
  onStartSign?: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  contract,
  onViewDocument,
  onViewReport,
  onStartSign,
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  const getStatusLabel = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.Reviewing: return t('status.reviewing');
      case ContractStatus.Active: return t('status.active');
      case ContractStatus.Dispute: return t('status.dispute');
      case ContractStatus.Completed: return t('status.completed');
      default: return t('status.draft');
    }
  };

  const status = (contract as any).status || ContractStatus.Draft;
  const analysis = (contract as any).analysis;

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            {t('contract.status')}
          </p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === ContractStatus.Active ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></span>
            <span className="font-bold text-slate-800">{getStatusLabel(status)}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            {t('contract.counterparty')}
          </p>
          <p className="font-medium text-slate-800">{(contract as any).partyName || 'N/A'}</p>
        </div>
      </div>

      {(status === ContractStatus.Draft || status === ContractStatus.Reviewing) && onStartSign && (
        <button
          onClick={onStartSign}
          className="w-full mb-3 bg-[#1e2432] text-white py-3 rounded-lg font-bold text-sm shadow-md shadow-slate-300 hover:bg-[#2c3549] transition-all flex items-center justify-center gap-2"
          data-html2canvas-ignore="true"
        >
          <PenTool size={16} className="text-[#ffc820]" />
          <span>{t('contract.startDocuSign')}</span>
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={onViewDocument}
          className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
          data-html2canvas-ignore="true"
        >
          {t('contract.viewOriginal')}
        </button>
        <button
          onClick={() => {
            if (onViewReport && analysis) {
              onViewReport(analysis);
            } else {
              toast.warning(t('contract.noReportData'));
            }
          }}
          className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
          data-html2canvas-ignore="true"
        >
          {analysis ? (
            <>
              <Sparkles size={14} className="text-blue-500" />
              <span>{t('contract.aiReport')} ({analysis.score}{t('common.points')})</span>
            </>
          ) : (
            t('contract.viewReport')
          )}
        </button>
      </div>
    </Card>
  );
};
