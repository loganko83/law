/**
 * usePayment Hook
 * Manages payment card state and operations
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedCard, NewCard } from '../types';

export interface UsePaymentResult {
  savedCards: SavedCard[];
  isPaymentModalOpen: boolean;
  isAddingCard: boolean;
  newCard: NewCard;
  setNewCard: React.Dispatch<React.SetStateAction<NewCard>>;
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  startAddingCard: () => void;
  cancelAddingCard: () => void;
  handleAddCard: () => void;
  handleDeleteCard: (id: string) => void;
}

const INITIAL_CARDS: SavedCard[] = [
  { id: 'c1', name: '신한카드', number: '1234', color: 'bg-blue-600' },
  { id: 'c2', name: '현대카드', number: '5678', color: 'bg-slate-700' }
];

const EMPTY_NEW_CARD: NewCard = { number: '', expiry: '', cvc: '', pwd: '' };

export function usePayment(): UsePaymentResult {
  const { t } = useTranslation();

  const [savedCards, setSavedCards] = useState<SavedCard[]>(INITIAL_CARDS);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState<NewCard>(EMPTY_NEW_CARD);

  const openPaymentModal = useCallback(() => setIsPaymentModalOpen(true), []);
  const closePaymentModal = useCallback(() => setIsPaymentModalOpen(false), []);
  const startAddingCard = useCallback(() => setIsAddingCard(true), []);
  const cancelAddingCard = useCallback(() => {
    setIsAddingCard(false);
    setNewCard(EMPTY_NEW_CARD);
  }, []);

  const handleAddCard = useCallback(() => {
    if (!newCard.number) return;
    const last4 = newCard.number.slice(-4) || '0000';
    setSavedCards(cards => [...cards, {
      id: `c_${Date.now()}`,
      name: t('profile.newCard'),
      number: last4,
      color: 'bg-indigo-600'
    }]);
    setNewCard(EMPTY_NEW_CARD);
    setIsAddingCard(false);
  }, [newCard.number, t]);

  const handleDeleteCard = useCallback((id: string) => {
    if (confirm(t('profile.deletePaymentConfirm'))) {
      setSavedCards(cards => cards.filter(c => c.id !== id));
    }
  }, [t]);

  return {
    savedCards,
    isPaymentModalOpen,
    isAddingCard,
    newCard,
    setNewCard,
    openPaymentModal,
    closePaymentModal,
    startAddingCard,
    cancelAddingCard,
    handleAddCard,
    handleDeleteCard,
  };
}
