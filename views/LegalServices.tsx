import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, MessageCircle, Scale, ChevronRight, FileText } from 'lucide-react';
import { Button } from '../components/Button';

interface LegalServicesProps {
  onNavigate: (view: 'CONTENT_PROOF' | 'LEGAL_QA') => void;
}

export const LegalServices: React.FC<LegalServicesProps> = ({ onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('legal.title')}</h1>
        <p className="text-slate-500 text-sm">{t('legal.subtitle', 'AI helps with complex legal matters.')}</p>
      </div>

      <div className="space-y-4">
        {/* Content Proof Generator */}
        <button 
          onClick={() => onNavigate('CONTENT_PROOF')}
          className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all group text-left"
        >
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Mail size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">{t('legal.contentProof')}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('legal.contentProofDescription')}
            </p>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-indigo-500" />
        </button>

        {/* Legal Q&A */}
        <button 
          onClick={() => onNavigate('LEGAL_QA')}
          className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all group text-left"
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <MessageCircle size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">{t('legal.qa')}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('legal.qaDescription')}
            </p>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-emerald-500" />
        </button>

        {/* Coming Soon */}
        <div className="w-full bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex items-center gap-5 opacity-60">
          <div className="w-14 h-14 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">
            <Scale size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-600 text-lg mb-1">{t('legal.lawyerMatching', 'Attorney Matching (Coming Soon)')}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('legal.lawyerMatchingDesc', 'Connect with specialized lawyers based on your analysis data.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
