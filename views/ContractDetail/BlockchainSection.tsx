/**
 * BlockchainSection Component
 * Displays blockchain anchors and anchoring functionality
 */

import React from 'react';
import {
  Shield,
  Link2,
  Loader,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
  ExternalLink,
  Award,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { BlockchainAnchor } from '../../services/api';

interface BlockchainSectionProps {
  anchors: BlockchainAnchor[];
  isLoading: boolean;
  isAnchoring: boolean;
  error: string | null;
  onAnchor: () => void;
  onDownloadCertificate: (anchorId: string) => void;
  getExplorerUrl: (txHash: string) => string;
  truncateHash: (hash: string, length?: number) => string;
}

export const BlockchainSection: React.FC<BlockchainSectionProps> = ({
  anchors,
  isLoading,
  isAnchoring,
  error,
  onAnchor,
  onDownloadCertificate,
  getExplorerUrl,
  truncateHash,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h3 className="font-bold text-lg text-slate-800 mb-3 px-1 flex items-center gap-2">
        <Shield size={18} className="text-blue-600" />
        {t('blockchain.title')}
      </h3>

      <Card className="border-l-4 border-l-purple-500">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="text-blue-600 animate-spin mr-3" />
            <p className="text-sm text-slate-500">{t('blockchain.loadingAnchors')}</p>
          </div>
        ) : error && anchors.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">{t('common.error')}</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : anchors.length === 0 ? (
          <div className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Link2 size={24} className="text-purple-600" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">{t('blockchain.noAnchors')}</p>
            <p className="text-xs text-slate-500 mb-4">{t('blockchain.noAnchorsDesc')}</p>
            <button
              onClick={onAnchor}
              disabled={isAnchoring}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              data-html2canvas-ignore="true"
            >
              {isAnchoring ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {t('blockchain.anchoring')}
                </>
              ) : (
                <>
                  <Link2 size={16} />
                  {t('blockchain.anchorButton')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link2 size={16} className="text-purple-600" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {t('blockchain.anchorsFound', { count: anchors.length })}
                </p>
              </div>
              <button
                onClick={onAnchor}
                disabled={isAnchoring}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition disabled:opacity-50"
                data-html2canvas-ignore="true"
              >
                {isAnchoring ? t('blockchain.anchoring') : t('blockchain.addAnchor')}
              </button>
            </div>

            {anchors.map((anchor) => (
              <div
                key={anchor.id}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {anchor.status === 'confirmed' ? (
                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                    ) : anchor.status === 'failed' ? (
                      <X size={20} className="text-red-600 flex-shrink-0" />
                    ) : (
                      <Clock size={20} className="text-orange-500 flex-shrink-0 animate-pulse" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {anchor.status === 'confirmed'
                          ? t('blockchain.statusConfirmed')
                          : anchor.status === 'failed'
                          ? t('blockchain.statusFailed')
                          : t('blockchain.statusPending')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(anchor.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">
                    <Shield size={12} />
                    {anchor.network}
                  </div>
                </div>

                {anchor.status === 'confirmed' && anchor.tx_hash && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                      <p className="text-xs text-slate-500 font-semibold">{t('blockchain.txHash')}:</p>
                      <a
                        href={getExplorerUrl(anchor.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1"
                      >
                        {truncateHash(anchor.tx_hash)}
                        <ExternalLink size={12} />
                      </a>
                    </div>

                    {anchor.block_number && (
                      <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                        <p className="text-xs text-slate-500 font-semibold">{t('blockchain.blockNumber')}:</p>
                        <p className="text-xs text-slate-800 font-mono">#{anchor.block_number}</p>
                      </div>
                    )}

                    <button
                      onClick={() => onDownloadCertificate(anchor.id)}
                      className="w-full mt-2 bg-purple-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                      data-html2canvas-ignore="true"
                    >
                      <Award size={14} />
                      {t('blockchain.downloadCertificate')}
                    </button>
                  </div>
                )}

                {anchor.status === 'pending' && (
                  <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                    <p className="text-xs text-orange-700">
                      {t('blockchain.pendingDesc')}
                    </p>
                  </div>
                )}

                {anchor.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                    <p className="text-xs text-red-700">
                      {t('blockchain.failedDesc')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
