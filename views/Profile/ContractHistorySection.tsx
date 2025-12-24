/**
 * ContractHistorySection Component
 * Contract history display with categories and recent records
 */

import React from 'react';
import { History, FileClock, Calendar, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HISTORY_CONTRACTS, ContractCategory } from './types';

interface ContractHistorySectionProps {
  categories: ContractCategory[];
}

export const ContractHistorySection: React.FC<ContractHistorySectionProps> = ({
  categories,
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
        <History size={16} className="text-blue-600" /> {t('profile.contractHistory')}
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {categories.map(cat => (
          <div
            key={cat.id}
            className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
          >
            <span className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors">{cat.label}</span>
            <span className="text-xl font-bold text-slate-800">{cat.count}건</span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wide flex justify-between items-center">
          <span>{t('profile.recentRecords')}</span>
          <button className="text-blue-600 hover:text-blue-700">{t('profile.viewAll')}</button>
        </div>
        {HISTORY_CONTRACTS.map((contract) => (
          <div
            key={contract.id}
            className="p-4 border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors mt-0.5">
                <FileClock size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{contract.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{contract.partyName}</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                    <Calendar size={10} /> {contract.date}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
          </div>
        ))}
      </div>
    </div>
  );
};
