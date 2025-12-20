import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Bell, ChevronRight, AlertTriangle, CheckCircle2, Clock, Plus, Briefcase, Building, FileText, ScrollText, X, ExternalLink, Scale, Handshake, Coins, TrendingUp, FileSignature } from 'lucide-react';
import { Contract, ContractStatus } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface HomeProps {
  contracts: Contract[];
  onContractClick: (contract: Contract) => void;
  onNewCheck: () => void;
  onTemplateClick?: (templateId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ contracts, onContractClick, onNewCheck, onTemplateClick }) => {
  const [filterType, setFilterType] = useState('전체');
  const [templateCategory, setTemplateCategory] = useState('전체');
  const [showNotifications, setShowNotifications] = useState(false);

  const activeContracts = contracts.filter(c => c.status !== ContractStatus.Completed);
  
  // Mapping for display
  const typeMap: Record<string, string> = {
      'Freelance': '프리랜서',
      'Rental': '임대차',
      'Employment': '근로',
      'Service': '용역',
      'Sales': '매매',
      'Business': '비즈니스',
      'Investment': '투자'
  };

  const reverseTypeMap: Record<string, string> = {
      '전체': 'All',
      '프리랜서': 'Freelance',
      '임대차': 'Rental',
      '근로': 'Employment',
      '용역': 'Service',
      '매매': 'Sales',
      '비즈니스': 'Business',
      '투자': 'Investment'
  };

  const filteredContracts = activeContracts.filter(c => 
    filterType === '전체' || c.type === reverseTypeMap[filterType]
  );

  const filters = ['전체', '프리랜서', '임대차', '근로', '용역', '비즈니스', '투자'];

  const templates = [
    // Standard Agreements (표준 계약)
    { id: 'freelance', title: '표준 용역', icon: <Briefcase size={22} />, color: 'bg-blue-50 text-blue-600', category: '표준 계약' },
    { id: 'nda', title: '비밀 유지', icon: <ScrollText size={22} />, color: 'bg-purple-50 text-purple-600', category: '표준 계약' },
    
    // Investment (투자)
    { id: 'investment', title: '투자 계약', icon: <Coins size={22} />, color: 'bg-yellow-50 text-yellow-600', category: '투자' },
    { id: 'spa', title: '지분 인수', icon: <TrendingUp size={22} />, color: 'bg-rose-50 text-rose-600', category: '투자' },

    // Business (비즈니스)
    { id: 'mou', title: 'MOU (협약)', icon: <Handshake size={22} />, color: 'bg-indigo-50 text-indigo-600', category: '비즈니스' },
    { id: 'loi', title: 'LOI (의향서)', icon: <FileText size={22} />, color: 'bg-sky-50 text-sky-600', category: '비즈니스' },
    { id: 'moa', title: 'MOA (합의)', icon: <FileSignature size={22} />, color: 'bg-slate-50 text-slate-600', category: '비즈니스' },

    // Real Estate (부동산)
    { id: 'rental', title: '임대차', icon: <Building size={22} />, color: 'bg-orange-50 text-orange-600', category: '부동산' },

    // Employment (고용)
    { id: 'labor', title: '근로 계약', icon: <FileText size={22} />, color: 'bg-emerald-50 text-emerald-600', category: '고용' },
  ];

  const templateCategories = ['전체', '표준 계약', '투자', '비즈니스', '부동산', '고용'];
  const filteredTemplates = templates.filter(t => templateCategory === '전체' || t.category === templateCategory);

  const notifications = [
      { id: 1, text: '(주)테크스타트 계약의 중도금 지급일이 3일 남았습니다.', time: '2시간 전', read: false },
      { id: 2, text: '새로운 근로 계약법 개정안이 적용되었습니다. 확인해보세요.', time: '1일 전', read: true },
  ];

  const externalLinks = [
    { title: '대한상사중재원', url: 'http://www.kcab.or.kr', desc: '분쟁 해결/중재' },
    { title: '대한변호사협회', url: 'https://www.koreanbar.or.kr', desc: '변호사 찾기' },
    { title: '대법원 나홀로소송', url: 'https://pro-se.scourt.go.kr', desc: '소송 서식' },
    { title: '법률구조공단', url: 'https://www.klac.or.kr', desc: '무료 법률 상담' },
  ];

  return (
    <div className="p-6 space-y-6 relative pb-32">
      {/* Header */}
      <header className="flex justify-between items-center pt-2 relative z-20">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SafeContract</h1>
          <p className="text-sm text-slate-500">당신의 AI 법률 비서</p>
        </div>
        <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full border shadow-sm relative transition-colors ${showNotifications ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
        >
          <Bell size={20} className={showNotifications ? 'text-blue-600' : 'text-slate-600'} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

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
                        <span className="text-xs font-bold text-slate-600">알림</span>
                        <button onClick={() => setShowNotifications(false)}><X size={14} className="text-slate-400" /></button>
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
            <p className="text-blue-100 text-sm font-medium mb-1">현재 상태</p>
            <h2 className="text-2xl font-bold">안전합니다</h2>
          </div>
          <div className="bg-blue-500/30 p-2 rounded-lg backdrop-blur-sm">
            <CheckCircle2 size={24} className="text-blue-100" />
          </div>
        </div>
        <p className="text-blue-100 text-sm mb-6">
          진행 중인 계약에서 발견된 치명적인 위험이 없습니다.
        </p>
        <Button 
          variant="secondary" 
          fullWidth 
          onClick={onNewCheck}
          className="bg-white text-blue-700 hover:bg-blue-50 border-none"
        >
          새 계약서 검토하기
        </Button>
      </div>

      {/* Active Contracts Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-slate-800">진행 중인 계약</h3>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-2 -mx-2 px-2">
            {filters.map(type => (
                <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        filterType === type 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {type}
                </button>
            ))}
        </div>

        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-400 text-sm">{filterType === '전체' ? '' : filterType} 계약이 없습니다.</p>
            </div>
          ) : (
            filteredContracts.map(contract => (
              <ContractCard key={contract.id} contract={contract} onClick={() => onContractClick(contract)} typeMap={typeMap} />
            ))
          )}
        </div>
      </div>

      {/* Contract Templates Section */}
      <div>
        <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg text-slate-800">계약서 템플릿</h3>
            <button className="text-xs text-blue-600 font-semibold">전체보기</button>
        </div>

        {/* Template Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar -mx-2 px-2">
            {templateCategories.map(cat => (
                 <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        templateCategory === cat 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 min-h-[140px]">
            <AnimatePresence mode='popLayout'>
            {filteredTemplates.length > 0 ? (
                filteredTemplates.map(t => (
                    <motion.button 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        key={t.id}
                        onClick={() => onTemplateClick?.(t.id)}
                        className="min-w-[110px] p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-transform"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${t.color}`}>
                            {t.icon}
                        </div>
                        <span className="text-xs font-bold text-slate-700">{t.title}</span>
                    </motion.button>
                ))
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="w-full text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl"
                >
                    해당 카테고리의 템플릿이 없습니다.
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

      {/* External Links Section */}
      <div>
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <Scale size={18} /> 주요 법률 기관
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
                        <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700">{link.title}</span>
                        <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-400" />
                    </div>
                    <p className="text-xs text-slate-500">{link.desc}</p>
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

const ContractCard: React.FC<{ contract: Contract; onClick: () => void; typeMap: Record<string, string> }> = ({ contract, onClick, typeMap }) => {
  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.Reviewing: return 'bg-orange-100 text-orange-700';
      case ContractStatus.Active: return 'bg-green-100 text-green-700';
      case ContractStatus.Dispute: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  
  const getStatusLabel = (status: ContractStatus) => {
      switch (status) {
          case ContractStatus.Reviewing: return '검토중';
          case ContractStatus.Active: return '진행중';
          case ContractStatus.Dispute: return '분쟁';
          case ContractStatus.Completed: return '완료';
          default: return '작성중';
      }
  };

  return (
    <Card onClick={onClick} className="flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-2">
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${getStatusColor(contract.status)}`}>
            {getStatusLabel(contract.status)}
            </div>
            <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                {typeMap[contract.type] || contract.type}
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
          <span>다음: 일정 확인</span>
        </div>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Card>
  );
};