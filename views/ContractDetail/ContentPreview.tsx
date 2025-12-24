/**
 * ContentPreview Component
 * Shows contract content preview with click to view full
 */

import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Contract } from '../../types';

interface ContentPreviewProps {
  contract: Contract;
  onViewDocument: () => void;
}

export const ContentPreview: React.FC<ContentPreviewProps> = ({
  contract,
  onViewDocument,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h3 className="font-bold text-lg text-slate-800 mb-3 px-1">{t('contract.content')}</h3>
      <div
        onClick={onViewDocument}
        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors group relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
        <div className="pl-2">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600">
              {t('contract.originalPreview')}
            </span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-serif">
            {(contract as any).content || contract.description || t('contract.noContent')}
          </p>
          <div className="mt-3 flex items-center text-xs font-bold text-blue-600">
            {t('contract.viewFullContent')} <ChevronRight size={14} />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <Button
          fullWidth
          onClick={onViewDocument}
          variant="outline"
          className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors"
        >
          <FileText size={16} /> {t('contract.viewFullOriginal')}
        </Button>
      </div>
    </div>
  );
};
