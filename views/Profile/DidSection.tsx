/**
 * DidSection Component
 * DID (Decentralized Identity) management section
 */

import React from 'react';
import {
  Shield,
  Fingerprint,
  Loader,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserDID } from '../../services/api';

interface DidSectionProps {
  didStatus: UserDID | null;
  isLoadingDid: boolean;
  isIssuingDid: boolean;
  onIssueDid: () => void;
  onRevokeDid: () => void;
  onCopyDid: () => void;
  truncateDidAddress: (address: string) => string;
}

export const DidSection: React.FC<DidSectionProps> = ({
  didStatus,
  isLoadingDid,
  isIssuingDid,
  onIssueDid,
  onRevokeDid,
  onCopyDid,
  truncateDidAddress,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-lg shadow-emerald-50 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Fingerprint size={80} className="text-emerald-600" />
      </div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-emerald-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
            <Shield size={12} /> {t('did.title')}
          </p>
          <h3 className="text-xl font-bold text-slate-800">{t('did.subtitle')}</h3>
        </div>
      </div>

      {isLoadingDid ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-emerald-600" size={32} />
        </div>
      ) : (
        <div className="space-y-3 relative z-10">
          {/* DID Status Display */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase">{t('did.status')}</p>
              {didStatus?.status === 'confirmed' && (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                  <CheckCircle size={10} /> {t('did.confirmed')}
                </span>
              )}
              {didStatus?.status === 'pending' && (
                <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                  <Loader className="animate-spin" size={10} /> {t('did.pending')}
                </span>
              )}
              {didStatus?.status === 'revoked' && (
                <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                  <AlertCircle size={10} /> {t('did.revoked')}
                </span>
              )}
              {(!didStatus || didStatus?.status === 'none') && (
                <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">
                  {t('did.none')}
                </span>
              )}
            </div>

            {didStatus?.status === 'confirmed' && didStatus.did_address && (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-lg border border-emerald-100">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs text-slate-500 mb-1">{t('did.address')}</p>
                    <p className="text-sm font-mono font-semibold text-slate-800 truncate" title={didStatus.did_address}>
                      {truncateDidAddress(didStatus.did_address)}
                    </p>
                  </div>
                  <button
                    onClick={onCopyDid}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex-shrink-0"
                    title={t('did.copy')}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                {didStatus.confirmed_at && (
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                    <Check size={10} /> {t('did.confirmedAt')}: {new Date(didStatus.confirmed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {didStatus?.status === 'pending' && (
              <div className="mt-3 bg-amber-50 p-3 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-700 flex items-center gap-2">
                  <Loader className="animate-spin" size={14} />
                  {t('did.pendingMessage')}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {(!didStatus || didStatus?.status === 'none') && (
              <button
                onClick={onIssueDid}
                disabled={isIssuingDid}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {isIssuingDid ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    {t('did.issuing')}
                  </>
                ) : (
                  <>
                    <Fingerprint size={16} />
                    {t('did.issueDid')}
                  </>
                )}
              </button>
            )}

            {didStatus?.status === 'confirmed' && (
              <button
                onClick={onRevokeDid}
                className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <AlertCircle size={16} />
                {t('did.revokeDid')}
              </button>
            )}
          </div>

          <p className="text-[10px] text-emerald-600 mt-2">
            {t('did.description')}
          </p>
        </div>
      )}
    </div>
  );
};
