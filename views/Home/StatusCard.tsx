/**
 * StatusCard Component
 *
 * Main status overview card with CTA button.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { CheckCircle2 } from 'lucide-react';

interface StatusCardProps {
  onNewCheck: () => void;
}

export const StatusCard: React.FC<StatusCardProps> = ({ onNewCheck }) => {
  const { t } = useTranslation();

  return (
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
  );
};

export default StatusCard;
