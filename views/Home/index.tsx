/**
 * Home View
 *
 * Main container component for the home screen.
 * Uses modular sub-components and custom hooks for separation of concerns.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { HomeProps, Notification } from './types';
import { useContracts } from './hooks/useContracts';
import { HomeHeader } from './HomeHeader';
import { StatusCard } from './StatusCard';
import { ContractsSection } from './ContractsSection';
import { TemplatesSection } from './TemplatesSection';
import { ExternalLinksSection } from './ExternalLinksSection';

export const Home: React.FC<HomeProps> = ({ onContractClick, onNewCheck, onTemplateClick }) => {
  const { t } = useTranslation();
  const { activeContracts, loading, error } = useContracts();

  const notifications: Notification[] = [
    { id: 1, text: t('notifications.paymentReminder'), time: '2h', read: false },
    { id: 2, text: t('notifications.lawUpdate'), time: '1d', read: true },
  ];

  return (
    <div className="p-6 space-y-6 relative pb-32">
      <HomeHeader notifications={notifications} />

      <StatusCard onNewCheck={onNewCheck} />

      <ContractsSection
        contracts={activeContracts}
        loading={loading}
        error={error}
        onContractClick={onContractClick}
      />

      <TemplatesSection onTemplateClick={onTemplateClick} />

      <ExternalLinksSection />

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

export default Home;
