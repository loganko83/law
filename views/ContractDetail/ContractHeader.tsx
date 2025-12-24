/**
 * ContractHeader Component
 * Header with navigation, title, and action buttons
 */

import React, { useState } from 'react';
import { ChevronLeft, MoreVertical, Share2, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';
import { Contract } from '../../types';

interface ContractHeaderProps {
  contract: Contract;
  onBack: () => void;
  onExportPDF: () => void;
  isExporting: boolean;
}

const FileEditIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const ContractHeader: React.FC<ContractHeaderProps> = ({
  contract,
  onBack,
  onExportPDF,
  isExporting,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [showMenu, setShowMenu] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: contract.title,
      text: `${contract.title} ${t('contract.detail')}. ${t('contract.parties')}: ${(contract as any).partyName || 'N/A'}.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
      toast.success(t('report.copiedToClipboard'));
    }
  };

  return (
    <div className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
      <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
        <ChevronLeft size={24} className="text-slate-600" />
      </button>
      <h2 className="font-bold text-slate-800 text-center truncate flex-1 px-2">
        {contract.title}
      </h2>
      <div className="flex items-center -mr-2 relative">
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className={`p-2 rounded-full hover:bg-slate-50 text-slate-600 ${isExporting ? 'opacity-50' : ''}`}
          aria-label="Export PDF"
        >
          <Download size={22} />
        </button>
        <button
          onClick={handleShare}
          className="p-2 rounded-full hover:bg-slate-50 text-slate-600"
          aria-label="Share"
        >
          <Share2 size={22} />
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-full hover:bg-slate-50 text-slate-600"
        >
          <MoreVertical size={22} />
        </button>

        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-slate-100 w-48 z-50 overflow-hidden"
            >
              <button
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => { setShowMenu(false); toast.info(t('contract.editInfo')); }}
              >
                <FileEditIcon size={16} /> {t('contract.editInfo')}
              </button>
              <button
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                onClick={() => { setShowMenu(false); toast.warning(t('contract.deleteContract')); }}
              >
                <X size={16} /> {t('contract.deleteContract')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
