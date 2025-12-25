/**
 * TemplatesSection Component
 *
 * Contract templates grid with category filtering.
 */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Building, FileText, ScrollText, Handshake, Coins, TrendingUp, FileSignature } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Template, TEMPLATE_CATEGORIES } from './types';

interface TemplatesSectionProps {
  onTemplateClick?: (templateId: string) => void;
}

const TEMPLATES: Template[] = [
  { id: 'freelance', titleKey: 'templates.freelance', icon: <Briefcase size={22} />, color: 'bg-blue-50 text-blue-600', category: 'standard' },
  { id: 'nda', titleKey: 'templates.nda', icon: <ScrollText size={22} />, color: 'bg-purple-50 text-purple-600', category: 'standard' },
  { id: 'investment', titleKey: 'templates.investment', icon: <Coins size={22} />, color: 'bg-yellow-50 text-yellow-600', category: 'investment' },
  { id: 'spa', titleKey: 'templates.spa', icon: <TrendingUp size={22} />, color: 'bg-rose-50 text-rose-600', category: 'investment' },
  { id: 'mou', titleKey: 'templates.mou', icon: <Handshake size={22} />, color: 'bg-indigo-50 text-indigo-600', category: 'business' },
  { id: 'loi', titleKey: 'templates.loi', icon: <FileText size={22} />, color: 'bg-sky-50 text-sky-600', category: 'business' },
  { id: 'moa', titleKey: 'templates.moa', icon: <FileSignature size={22} />, color: 'bg-slate-50 text-slate-600', category: 'business' },
  { id: 'rental', titleKey: 'templates.rental', icon: <Building size={22} />, color: 'bg-orange-50 text-orange-600', category: 'realEstate' },
  { id: 'labor', titleKey: 'templates.labor', icon: <FileText size={22} />, color: 'bg-emerald-50 text-emerald-600', category: 'employment' },
];

export const TemplatesSection: React.FC<TemplatesSectionProps> = ({ onTemplateClick }) => {
  const { t } = useTranslation();
  const [templateCategory, setTemplateCategory] = useState('all');

  const categoryLabelMap: Record<string, string> = {
    'all': t('filters.all'),
    'standard': t('filters.standard'),
    'investment': t('filters.investment'),
    'business': t('filters.business'),
    'realEstate': t('filters.realEstate'),
    'employment': t('filters.employment')
  };

  const filteredTemplates = useMemo(
    () => TEMPLATES.filter(tpl => templateCategory === 'all' || tpl.category === templateCategory),
    [templateCategory]
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg text-slate-800">{t('home.templates')}</h3>
        <button className="text-sm text-blue-600 font-semibold px-2 py-2 min-h-[44px] hover:bg-blue-50 rounded-lg transition-colors" data-testid="btn-view-all-templates">
          {t('home.viewAll')}
        </button>
      </div>

      {/* Template Categories - minimum 44px touch target */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-2 px-2">
        {TEMPLATE_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setTemplateCategory(cat)}
            data-testid={`template-cat-${cat}`}
            className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              templateCategory === cat
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {categoryLabelMap[cat]}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 min-h-[140px]">
        <AnimatePresence mode='popLayout'>
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map(tpl => (
              <motion.button
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                key={tpl.id}
                onClick={() => onTemplateClick?.(tpl.id)}
                data-testid={`template-${tpl.id}`}
                className="min-w-[110px] min-h-[120px] p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-transform hover:border-blue-200 hover:shadow-md"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tpl.color}`}>
                  {tpl.icon}
                </div>
                <span className="text-xs font-bold text-slate-700 text-center">{t(tpl.titleKey)}</span>
              </motion.button>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl"
            >
              {t('home.noContracts')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TemplatesSection;
