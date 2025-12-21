import React, { useState } from 'react';
import { User, Settings, CreditCard, LogOut, Shield, Mail, Phone, ChevronRight, FileClock, History, Edit2, Calendar, X, Check, Trash2, Plus, Smartphone, Database, Brain, Sun, Moon } from 'lucide-react';
import { Contract, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

interface ProfileProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onBack: () => void;
}

// Mock History Data
const HISTORY_CONTRACTS: Partial<Contract>[] = [
    { id: 'h1', title: '2022 연봉 계약서', type: 'Employment', date: '2022-01-05', partyName: '(주)이전회사' },
    { id: 'h2', title: '서초 오피스텔 전세 계약', type: 'Rental', date: '2021-08-15', partyName: '김임대' },
    { id: 'h3', title: '중고차 매매 계약서', type: 'Sales', date: '2020-05-20', partyName: '박차왕' },
    { id: 'h4', title: '2021 프리랜서 용역 계약', type: 'Freelance', date: '2021-02-10', partyName: '스타트업A' },
];

export const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile, onBack }) => {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();

  // Payment State
  const [savedCards, setSavedCards] = useState([
      { id: 'c1', name: '신한카드', number: '1234', color: 'bg-blue-600' },
      { id: 'c2', name: '현대카드', number: '5678', color: 'bg-slate-700' }
  ]);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({ number: '', expiry: '', cvc: '', pwd: '' });

  // Edit Profile State
  const [isEditProfileOpen, setEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState<UserProfile>(userProfile);

  // Categories for stats
  const categories = [
      { id: 'Employment', label: t('contractTypes.Employment'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Employment').length },
      { id: 'Rental', label: t('contractTypes.Rental'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Rental').length },
      { id: 'Sales', label: t('contractTypes.Sales'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Sales').length },
      { id: 'Freelance', label: t('contractTypes.Freelance'), count: HISTORY_CONTRACTS.filter(c => c.type === 'Freelance').length },
  ];

  const handleSaveProfile = () => {
      onUpdateProfile(editForm);
      setEditProfileOpen(false);
  };

  const handleAddCard = () => {
      if (!newCard.number) return;
      const last4 = newCard.number.slice(-4) || '0000';
      setSavedCards([...savedCards, {
          id: `c_${Date.now()}`,
          name: t('profile.newCard'),
          number: last4,
          color: 'bg-indigo-600'
      }]);
      setNewCard({ number: '', expiry: '', cvc: '', pwd: '' });
      setIsAddingCard(false);
  };

  const handleDeleteCard = (id: string) => {
      if (confirm(t('profile.deletePaymentConfirm'))) {
          setSavedCards(savedCards.filter(c => c.id !== id));
      }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Profile Header */}
      <div className="bg-white p-6 pb-8 rounded-b-3xl shadow-sm border-b border-slate-100 flex flex-col items-center relative">
         <div className="relative mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center text-blue-600 border-4 border-white shadow-lg">
                <User size={40} />
            </div>
            <button 
                onClick={() => { setEditForm(userProfile); setEditProfileOpen(true); }}
                className="absolute bottom-1 right-0 bg-slate-800 text-white p-2 rounded-full border-2 border-white shadow-md hover:bg-slate-700 transition-colors"
            >
                <Edit2 size={14} />
            </button>
         </div>
         
         <h2 className="text-2xl font-bold text-slate-900 mb-1">{userProfile.name}</h2>
         <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
            <span>{userProfile.email}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>{userProfile.phone}</span>
         </div>

         <div className="flex gap-3 w-full max-w-xs">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('profile.joinDate')}</span>
                <span className="text-sm font-semibold text-slate-700">2023.01.15</span>
            </div>
            <div className="flex-1 bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center border border-slate-100">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('profile.totalContracts')}</span>
                <span className="text-sm font-semibold text-slate-700">{t('profile.contractsCount', { count: HISTORY_CONTRACTS.length })}</span>
            </div>
         </div>
      </div>

      <div className="p-6 space-y-6">
        {/* RAG Context / My Legal DNA Section */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-lg shadow-indigo-50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Brain size={80} className="text-indigo-600" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <p className="text-indigo-600 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                        <Database size={12} /> {t('profile.aiKnowledgeBase')}
                    </p>
                    <h3 className="text-xl font-bold text-slate-800">{t('profile.legalDna')}</h3>
                </div>
                <button
                    onClick={() => { setEditForm(userProfile); setEditProfileOpen(true); }}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                    {t('profile.updateInfo')}
                </button>
            </div>
            <div className="space-y-3 relative z-10">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.industryJob')}</p>
                    <p className="text-sm font-semibold text-slate-800">{userProfile.businessType || t('profile.notEntered')}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.businessDescriptionLabel')}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{userProfile.businessDescription || t('profile.businessDescriptionPlaceholder')}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('profile.legalConcernsLabel')}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{userProfile.legalConcerns || t('profile.legalConcernsPlaceholder')}</p>
                </div>
            </div>
            <p className="text-[10px] text-indigo-400 mt-3 flex items-center gap-1">
                <Check size={10} /> {t('profile.aiAutoApply')}
            </p>
        </div>
        
        {/* Contract History Section */}
        <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <History size={16} className="text-blue-600" /> {t('profile.contractHistory')}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group">
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
                    <div key={contract.id} className="p-4 border-b border-slate-50 last:border-none hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer group">
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

        {/* Display Settings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {resolvedTheme === 'dark' ? <Moon size={18} className="text-indigo-500" /> : <Sun size={18} className="text-amber-500" />}
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{t('profile.displaySettings')}</h3>
                </div>
            </div>
            <ThemeToggle variant="select" />
        </div>

        {/* Settings Menu */}
        <div className="space-y-2 pt-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-2 px-1">{t('profile.accountSettings')}</h3>
            <MenuItem
                icon={<User size={18} />}
                label={t('profile.editPersonalInfo')}
                onClick={() => { setEditForm(userProfile); setEditProfileOpen(true); }}
            />
            <MenuItem
                icon={<CreditCard size={18} />}
                label={t('profile.paymentManagement')}
                onClick={() => { setIsAddingCard(false); setPaymentModalOpen(true); }}
            />
            <MenuItem icon={<Settings size={18} />} label={t('profile.appSettings')} />
        </div>

        <div className="pt-4">
            <button
                onClick={onBack}
                className="w-full py-3.5 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
            >
                <LogOut size={18} /> {t('profile.logout')}
            </button>
        </div>
      </div>

      {/* Edit Profile / RAG Context Modal */}
      <AnimatePresence>
        {isEditProfileOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setEditProfileOpen(false)}
                />
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10 max-h-[90vh] overflow-y-auto"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">{t('profile.editInfo')}</h3>
                        <button onClick={() => setEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-2">{t('profile.basicInfo')}</h4>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.nameLabel')}</label>
                            <input 
                                type="text" 
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.emailLabel')}</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.phoneLabel')}</label>
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                                placeholder={t('profile.phonePlaceholder')}
                            />
                        </div>

                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-2 mt-6 flex items-center gap-1">
                            <Database size={12} /> {t('profile.aiKnowledgeBaseDna')}
                        </h4>
                        <div className="bg-indigo-50 p-3 rounded-lg mb-2 text-[10px] text-indigo-700 leading-relaxed">
                            {t('profile.aiContextDescription')}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.industryJobLabel')}</label>
                            <input
                                type="text"
                                value={editForm.businessType}
                                onChange={(e) => setEditForm({...editForm, businessType: e.target.value})}
                                placeholder={t('profile.industryJobPlaceholder')}
                                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.businessDescriptionInputLabel')}</label>
                            <textarea
                                value={editForm.businessDescription}
                                onChange={(e) => setEditForm({...editForm, businessDescription: e.target.value})}
                                placeholder={t('profile.businessDescriptionInputPlaceholder')}
                                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.legalConcernsInputLabel')}</label>
                            <textarea
                                value={editForm.legalConcerns}
                                onChange={(e) => setEditForm({...editForm, legalConcerns: e.target.value})}
                                placeholder={t('profile.legalConcernsInputPlaceholder')}
                                className="w-full bg-white border border-slate-300 rounded-xl py-3 px-3 text-sm focus:border-indigo-500 outline-none h-20 resize-none"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                            >
                                {t('profile.saveAndUpdateAi')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Payment Method Modal (Existing Code) */}
      <AnimatePresence>
        {isPaymentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={() => setPaymentModalOpen(false)}
                />
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">
                            {isAddingCard ? t('profile.addNewCard') : t('profile.paymentManagement')}
                        </h3>
                        <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    {!isAddingCard ? (
                        <div className="space-y-4">
                            {savedCards.length > 0 ? (
                                savedCards.map(card => (
                                    <div key={card.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:border-blue-100 transition-colors group">
                                        <div className={`w-12 h-8 rounded-md ${card.color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                                            CARD
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 text-sm">{card.name}</p>
                                            <p className="text-xs text-slate-500">**** **** **** {card.number}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteCard(card.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    {t('profile.noPaymentMethods')}
                                </div>
                            )}

                            <button
                                onClick={() => setIsAddingCard(true)}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                <Plus size={18} /> {t('profile.registerNewCard')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-xl mb-4 flex items-center gap-3">
                                <div className="w-10 h-6 bg-blue-200 rounded-md overflow-hidden relative">
                                    <div className="absolute top-1 left-0 right-0 h-1.5 bg-blue-300/50"></div>
                                </div>
                                <p className="text-xs text-blue-700 leading-tight">
                                    {t('profile.securePaymentNotice')}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.cardNumber')}</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={newCard.number}
                                        onChange={(e) => setNewCard({...newCard, number: e.target.value})}
                                        placeholder={t('profile.cardNumberPlaceholder')}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-sm focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.expiryDate')}</label>
                                    <input type="text" placeholder={t('profile.expiryDatePlaceholder')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none text-center transition-colors" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('profile.cvc')}</label>
                                    <input type="password" placeholder={t('profile.cvcPlaceholder')} maxLength={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none text-center transition-colors" />
                                </div>
                            </div>
                            
                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={() => setIsAddingCard(false)}
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={handleAddCard}
                                    className="flex-[2] bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> {t('profile.completeCardRegistration')}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button 
        onClick={onClick}
        className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group active:scale-[0.99]"
    >
        <div className="flex items-center gap-3 text-slate-500 group-hover:text-blue-600 transition-colors">
            {icon}
            <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{label}</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
    </button>
);