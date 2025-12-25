import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Bell, ChevronRight, AlertTriangle, CheckCircle2, Clock, Plus, Briefcase, Building, FileText, ScrollText, X, ExternalLink, Scale, Handshake, Coins, TrendingUp, FileSignature, FileQuestion } from 'lucide-react';
import { ListSkeleton } from '../components/Skeleton';
import { Contract, ContractStatus } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { contractsApi, Contract as ApiContract } from '../services/api';

interface HomeProps {
  onContractClick: (contract: Contract) => void;
  onNewCheck: () => void;
  onTemplateClick?: (templateId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onContractClick, onNewCheck, onTemplateClick }) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState('all');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiContracts = await contractsApi.list();

        const mappedContracts: Contract[] = apiContracts.map((apiContract: ApiContract) => ({
          id: apiContract.id,
          title: apiContract.title,
          type: apiContract.contract_type || 'Service',
          date: new Date(apiContract.created_at).toLocaleDateString('ko-KR'),
          status: mapApiStatusToContractStatus(apiContract.status),
          partyName: apiContract.description || t('contract.unknownParty'),
        }));

        setContracts(mappedContracts);
      } catch (err) {
        console.error('Failed to fetch contracts:', err);
        setError(err instanceof Error ? err.message : t('errors.fetchFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [t]);

  const mapApiStatusToContractStatus = (apiStatus: string): ContractStatus => {
    switch (apiStatus) {
      case 'draft':
        return ContractStatus.Draft;
      case 'pending':
        return ContractStatus.Reviewing;
      case 'active':
        return ContractStatus.Active;
      case 'expired':
      case 'terminated':
        return ContractStatus.Completed;
      default:
        return ContractStatus.Reviewing;
    }
  };

  const activeContracts = contracts.filter(c => c.status !== ContractStatus.Completed);

  const filterKeyMap: Record<string, string> = {
    'all': 'all',
    'Freelance': 'freelance',
    'Rental': 'rental',
    'Employment': 'employment',
    'Service': 'service',
    'Sales': 'service',
    'Business': 'business',
    'Investment': 'investment'
  };

  const filteredContracts = useMemo(() =>
    activeContracts.filter(c => filterType === 'all' || filterKeyMap[c.type] === filterType),
    [activeContracts, filterType]
  );

  const filters = ['all', 'freelance', 'rental', 'employment', 'service', 'business', 'investment'];

  const templates = [
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

  const templateCategories = ['all', 'standard', 'investment', 'business', 'realEstate', 'employment'];
  const categoryLabelMap: Record<string, string> = {
    'all': t('filters.all'),
    'standard': t('filters.standard'),
    'investment': t('filters.investment'),
    'business': t('filters.business'),
    'realEstate': t('filters.realEstate'),
    'employment': t('filters.employment')
  };
  const filteredTemplates = useMemo(() =>
    templates.filter(tpl => templateCategory === 'all' || tpl.category === templateCategory),
    [templateCategory]
  );

  const notifications = [
      { id: 1, text: t('notifications.paymentReminder'), time: '2h', read: false },
      { id: 2, text: t('notifications.lawUpdate'), time: '1d', read: true },
  ];

  const externalLinks = [
    { titleKey: 'externalLinks.arbitration', url: 'http://www.kcab.or.kr', descKey: 'externalLinks.arbitrationDesc' },
    { titleKey: 'externalLinks.bar', url: 'https://www.koreanbar.or.kr', descKey: 'externalLinks.barDesc' },
    { titleKey: 'externalLinks.court', url: 'https://pro-se.scourt.go.kr', descKey: 'externalLinks.courtDesc' },
    { titleKey: 'externalLinks.legalAid', url: 'https://www.klac.or.kr', descKey: 'externalLinks.legalAidDesc' },
  ];

  return (
    <div className="p-6 space-y-6 relative pb-32">
      {/* Header */}
      <header className="flex justify-between items-center pt-2 relative z-20">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('app.name')}</h1>
          <p className="text-sm text-slate-500">{t('app.tagline')}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            data-testid="btn-notifications"
            aria-label={t('notifications.title')}
            aria-expanded={showNotifications}
            aria-haspopup="true"
            className={`p-3 min-w-[44px] min-h-[44px] rounded-full border shadow-sm relative transition-colors flex items-center justify-center ${showNotifications ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
          >
            <Bell size={20} className={showNotifications ? 'text-blue-600' : 'text-slate-600'} aria-hidden="true" />
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" aria-label="unread notifications"></span>
          </button>
        </div>

        {/* Notification Dropdown */}
        <AnimatePresence>
            {showNotifications && (
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                >
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-xs font-bold text-slate-600">{t('notifications.title')}</span>
                        <button onClick={() => setShowNotifications(false)} aria-label={t('common.close')} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-400" aria-hidden="true" /></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.map(n => (
                            <div key={n.id} className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${n.read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`w-2 h-2 rounded-full mt-1.5 ${n.read ? 'bg-slate-300' : 'bg-blue-500'}`}></span>
                                    <span className="text-[10px] text-slate-400 ml-2">{n.time}</span>
                                </div>
                                <p className="text-xs text-slate-700 pl-4 leading-relaxed">{n.text}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </header>

      {/* Main Status Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl shadow-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1">{t('home.currentStatus')}</p>
            <h2 className="text-2xl font-bold">{t('home.safe')}</h2>
          </div>
          <div className="bg-blue-500/30 p-2 rounded-lg backdrop-blur-sm">
            <CheckCircle2 size={24} className="text-blue-100" />
          </div>
        </div>
        <p className="text-blue-100 text-sm mb-6">
          {t('home.safeDescription')}
        </p>
        <Button
          variant="secondary"
          fullWidth
          onClick={onNewCheck}
          className="bg-white text-blue-700 hover:bg-blue-50 border-none"
        >
          {t('home.newCheck')}
        </Button>
      </div>

      {/* Active Contracts Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">{t('home.activeContracts')}</h3>
        </div>

        {/* Filter Chips - minimum 44px touch target for accessibility */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2 -mx-2 px-2">
            {filters.map(filterKey => (
                <button
                    key={filterKey}
                    onClick={() => setFilterType(filterKey)}
                    data-testid={`filter-${filterKey}`}
                    className={`px-4 py-2.5 min-h-[44px] rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                        filterType === filterKey
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {t(`filters.${filterKey}`)}
                </button>
            ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <ListSkeleton count={3} />
          ) : error ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-red-200">
              <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-sm font-semibold">{t('errors.loadFailed')}</p>
              <p className="text-slate-400 text-xs mt-1">{error}</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300 flex flex-col items-center">
              <FileQuestion size={48} className="text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">{t('home.noContracts')}</p>
              <p className="text-slate-400 text-xs mt-1">{t('home.noContractsDesc', 'Upload a contract to get started')}</p>
            </div>
          ) : (
            filteredContracts.map(contract => (
              <ContractCard key={contract.id} contract={contract} onClick={() => onContractClick(contract)} t={t} />
            ))
          )}
        </div>
      </div>

      {/* Contract Templates Section */}
      <div>
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-slate-800">{t('home.templates')}</h3>
            <button className="text-sm text-blue-600 font-semibold px-2 py-2 min-h-[44px] hover:bg-blue-50 rounded-lg transition-colors" data-testid="btn-view-all-templates">{t('home.viewAll')}</button>
        </div>

        {/* Template Categories - minimum 44px touch target */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-2 px-2">
            {templateCategories.map(cat => (
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

      {/* External Links Section */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <Scale size={18} /> {t('home.legalOrgs')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
            {externalLinks.map((link, idx) => (
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

      {/* Floating Action Button */}
      <button
        onClick={onNewCheck}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-300/50 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-50 md:absolute md:bottom-24 md:right-6"
        aria-label="New Check"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const ContractCard: React.FC<{ contract: Contract; onClick: () => void; t: (key: string) => string }> = ({ contract, onClick, t }) => {
  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.Reviewing: return 'bg-orange-100 text-orange-700';
      case ContractStatus.Active: return 'bg-green-100 text-green-700';
      case ContractStatus.Dispute: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusKey = (status: ContractStatus) => {
      switch (status) {
          case ContractStatus.Reviewing: return 'reviewing';
          case ContractStatus.Active: return 'active';
          case ContractStatus.Dispute: return 'dispute';
          case ContractStatus.Completed: return 'completed';
          default: return 'draft';
      }
  };

  const getTypeKey = (type: string) => {
    const typeMap: Record<string, string> = {
      'Freelance': 'freelance',
      'Rental': 'rental',
      'Employment': 'employment',
      'Service': 'service',
      'Business': 'business',
      'Investment': 'investment'
    };
    return typeMap[type] || 'service';
  };

  return (
    <Card onClick={onClick} className="flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(contract.status)}`}>
            {t(`status.${getStatusKey(contract.status)}`)}
            </div>
            <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                {t(`filters.${getTypeKey(contract.type)}`)}
            </div>
        </div>
        <span className="text-xs text-slate-400">{contract.date}</span>
      </div>
      <div>
        <h4 className="font-bold text-slate-800">{contract.title}</h4>
        <p className="text-sm text-slate-500 mt-1">{contract.partyName}</p>
      </div>
      <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={14} />
          <span>{t('contract.next')}: {t('contract.schedule')}</span>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Card>
  );
};