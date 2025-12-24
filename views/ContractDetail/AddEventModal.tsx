/**
 * AddEventModal Component
 * Modal for adding new timeline events
 */

import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { InputField } from '../../components/FormField';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  newEvent: { title: string; date: string };
  setNewEvent: React.Dispatch<React.SetStateAction<{ title: string; date: string }>>;
  onAddEvent: () => void;
}

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  newEvent,
  setNewEvent,
  onAddEvent,
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
            className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl relative z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-event-title"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="add-event-title" className="font-bold text-lg text-slate-800">
                {t('contract.addNewEvent')}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <InputField
                label={t('contract.eventName')}
                type="text"
                value={newEvent.title}
                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder={t('contract.eventNamePlaceholder')}
                required
                autoFocus
              />
              <InputField
                label={t('contract.date')}
                type="date"
                value={newEvent.date}
                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                required
              />
              <div className="pt-2">
                <button
                  onClick={onAddEvent}
                  disabled={!newEvent.title || !newEvent.date}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  {t('common.add')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
