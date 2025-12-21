import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ko', label: '한국어', short: 'KR' },
    { code: 'en', label: 'English', short: 'EN' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko';
    i18n.changeLanguage(nextLang);
  };

  if (compact) {
    // Minimum 44px touch target for accessibility
    return (
      <button
        onClick={toggleLanguage}
        data-testid="lang-switcher"
        aria-label={`Switch language, current: ${currentLang.label}`}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
      >
        <Globe size={16} className="text-slate-500" />
        <span className="font-medium text-slate-700">{currentLang.short}</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2" data-testid="lang-switcher-full">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          data-testid={`lang-${lang.code}`}
          className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl transition-all ${
            i18n.language === lang.code
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
          }`}
        >
          <span className="font-medium">{lang.label}</span>
        </button>
      ))}
    </div>
  );
};
