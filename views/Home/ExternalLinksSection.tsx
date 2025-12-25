/**
 * ExternalLinksSection Component
 *
 * Grid of external legal organization links.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, ExternalLink } from 'lucide-react';
import { ExternalLink as ExternalLinkType } from './types';

const EXTERNAL_LINKS: ExternalLinkType[] = [
  { titleKey: 'externalLinks.arbitration', url: 'http://www.kcab.or.kr', descKey: 'externalLinks.arbitrationDesc' },
  { titleKey: 'externalLinks.bar', url: 'https://www.koreanbar.or.kr', descKey: 'externalLinks.barDesc' },
  { titleKey: 'externalLinks.court', url: 'https://pro-se.scourt.go.kr', descKey: 'externalLinks.courtDesc' },
  { titleKey: 'externalLinks.legalAid', url: 'https://www.klac.or.kr', descKey: 'externalLinks.legalAidDesc' },
];

export const ExternalLinksSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
        <Scale size={18} /> {t('home.legalOrgs')}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {EXTERNAL_LINKS.map((link, idx) => (
          <a
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700">{t(link.titleKey)}</span>
              <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-400" />
            </div>
            <p className="text-xs text-slate-500">{t(link.descKey)}</p>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ExternalLinksSection;
