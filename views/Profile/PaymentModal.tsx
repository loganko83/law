/**
 * PaymentModal Component
 * Modal for managing payment methods
 */

import React from 'react';
import { X, Trash2, Plus, CreditCard, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SavedCard, NewCard } from './types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedCards: SavedCard[];
  isAddingCard: boolean;
  newCard: NewCard;
  setNewCard: React.Dispatch<React.SetStateAction<NewCard>>;
  onStartAddingCard: () => void;
  onCancelAddingCard: () => void;
  onAddCard: () => void;
  onDeleteCard: (id: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  savedCards,
  isAddingCard,
  newCard,
  setNewCard,
  onStartAddingCard,
  onCancelAddingCard,
  onAddCard,
  onDeleteCard,
}) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 id="payment-modal-title" className="font-bold text-lg text-slate-800">
                {isAddingCard ? t('profile.addNewCard') : t('profile.paymentManagement')}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {!isAddingCard ? (
              <div className="space-y-4">
                {savedCards.length > 0 ? (
                  savedCards.map(card => (
                    <div
                      key={card.id}
                      className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:border-blue-100 transition-colors group"
                    >
                      <div className={`w-12 h-8 rounded-md ${card.color} flex items-center justify-center text-white text-[10px] font-bold shadow-sm`}>
                        CARD
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800 text-sm">{card.name}</p>
                        <p className="text-xs text-slate-500">**** **** **** {card.number}</p>
                      </div>
                      <button
                        onClick={() => onDeleteCard(card.id)}
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
                  onClick={onStartAddingCard}
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
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    {t('profile.cardNumber')}
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={newCard.number}
                      onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                      placeholder={t('profile.cardNumberPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-sm focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      {t('profile.expiryDate')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('profile.expiryDatePlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none text-center transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      {t('profile.cvc')}
                    </label>
                    <input
                      type="password"
                      placeholder={t('profile.cvcPlaceholder')}
                      maxLength={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none text-center transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={onCancelAddingCard}
                    className="flex-1 bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={onAddCard}
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
  );
};
