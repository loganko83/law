import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Check,
  X,
  Crown,
  Zap,
  Building2,
  ChevronRight,
  FileText,
  Download,
  BarChart3,
  AlertCircle,
  Loader,
  ArrowLeft,
  Star,
  Sparkles,
  Shield,
  Database,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
  subscriptionsApi,
  SubscriptionPlan,
  UserSubscription,
  UsageStats,
  Invoice
} from '../services/api';

interface BillingProps {
  onBack: () => void;
}

export const Billing: React.FC<BillingProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadBillingData();
    }
  }, [isAuthenticated]);

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      const [plansData, subData, usageData, invoicesData] = await Promise.all([
        subscriptionsApi.getPlans(),
        subscriptionsApi.getCurrentSubscription().catch(() => null),
        subscriptionsApi.getUsage().catch(() => null),
        subscriptionsApi.getInvoices().catch(() => [])
      ]);

      setPlans(plansData);
      setSubscription(subData);
      setUsage(usageData);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      addToast({ message: t('billing.loadError'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      addToast({ message: t('billing.loginRequired'), type: 'error' });
      return;
    }

    setIsUpgrading(true);
    try {
      await subscriptionsApi.subscribe({
        plan_type: plan.plan_type,
        billing_cycle: billingCycle
      });
      addToast({ message: t('billing.subscribeSuccess'), type: 'success' });
      await loadBillingData();
      setShowUpgradeModal(false);
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('billing.subscribeError'),
        type: 'error'
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    setIsUpgrading(true);
    try {
      await subscriptionsApi.upgrade(selectedPlan.plan_type);
      addToast({ message: t('billing.upgradeSuccess'), type: 'success' });
      await loadBillingData();
      setShowUpgradeModal(false);
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('billing.upgradeError'),
        type: 'error'
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancel = async () => {
    try {
      const result = await subscriptionsApi.cancel();
      addToast({ message: t('billing.cancelSuccess'), type: 'success' });
      await loadBillingData();
      setShowCancelModal(false);
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('billing.cancelError'),
        type: 'error'
      });
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free': return <Zap size={24} className="text-slate-500" />;
      case 'basic': return <Star size={24} className="text-blue-500" />;
      case 'pro': return <Crown size={24} className="text-amber-500" />;
      case 'enterprise': return <Building2 size={24} className="text-purple-500" />;
      default: return <Zap size={24} />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'border-slate-200 bg-slate-50';
      case 'basic': return 'border-blue-200 bg-blue-50';
      case 'pro': return 'border-amber-200 bg-amber-50';
      case 'enterprise': return 'border-purple-200 bg-purple-50';
      default: return 'border-slate-200';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency || 'KRW',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (!limit) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('billing.title')}</h1>
            <p className="text-xs text-slate-500">{t('billing.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Plan */}
        {subscription && (
          <div className={`rounded-2xl p-5 border-2 ${getPlanColor(subscription.plan.plan_type)} relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              {getPlanIcon(subscription.plan.plan_type)}
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {t('billing.currentPlan')}
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {subscription.plan.name}
                </h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                subscription.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {subscription.status === 'active' ? t('billing.active') :
                 subscription.status === 'trial' ? t('billing.trial') :
                 subscription.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                  {t('billing.billingCycle')}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {subscription.billing_cycle === 'yearly' ? t('billing.yearly') : t('billing.monthly')}
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                  {t('billing.nextBilling')}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {subscription.current_period_end
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </div>

            {subscription.plan.plan_type !== 'enterprise' && (
              <button
                onClick={() => {
                  setSelectedPlan(plans.find(p =>
                    p.plan_type === (subscription.plan.plan_type === 'free' ? 'basic' :
                                      subscription.plan.plan_type === 'basic' ? 'pro' : 'enterprise')
                  ) || null);
                  setShowUpgradeModal(true);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                {t('billing.upgradePlan')}
              </button>
            )}
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                {t('billing.usageStats')}
              </h3>
              <button
                onClick={loadBillingData}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Contracts */}
              <UsageBar
                label={t('billing.contracts')}
                current={usage.contracts_created}
                limit={usage.contracts_limit}
                icon={<FileText size={14} />}
              />

              {/* Analyses */}
              <UsageBar
                label={t('billing.analyses')}
                current={usage.analyses_performed}
                limit={usage.analyses_limit}
                icon={<Shield size={14} />}
              />

              {/* Signatures */}
              <UsageBar
                label={t('billing.signatures')}
                current={usage.signatures_made}
                limit={usage.signatures_limit}
                icon={<Check size={14} />}
              />

              {/* Storage */}
              <UsageBar
                label={t('billing.storage')}
                current={usage.storage_used_mb}
                limit={usage.storage_limit}
                icon={<Database size={14} />}
                unit="MB"
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
              <Clock size={10} />
              {t('billing.periodInfo', {
                start: new Date(usage.period_start).toLocaleDateString(),
                end: new Date(usage.period_end).toLocaleDateString()
              })}
            </p>
          </div>
        )}

        {/* Plans Comparison */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Crown size={18} className="text-amber-500" />
            {t('billing.availablePlans')}
          </h3>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {t('billing.monthly')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {t('billing.yearly')}
              <span className="ml-1 text-xs text-green-600">-20%</span>
            </button>
          </div>

          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`border rounded-xl p-4 transition-all ${
                  subscription?.plan.id === plan.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getPlanIcon(plan.plan_type)}
                    <div>
                      <h4 className="font-bold text-slate-900">{plan.name}</h4>
                      <p className="text-xs text-slate-500">{plan.description}</p>
                    </div>
                  </div>
                  {subscription?.plan.id === plan.id && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-bold">
                      {t('billing.current')}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-slate-900">
                    {formatPrice(
                      billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly,
                      plan.currency
                    )}
                  </span>
                  <span className="text-sm text-slate-500">/ {t('billing.perMonth')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <FeatureItem
                    label={t('billing.contractsLimit')}
                    value={plan.max_contracts ? `${plan.max_contracts}${t('billing.perMonth')}` : t('billing.unlimited')}
                  />
                  <FeatureItem
                    label={t('billing.analysesLimit')}
                    value={plan.max_analyses_per_month ? `${plan.max_analyses_per_month}${t('billing.perMonth')}` : t('billing.unlimited')}
                  />
                  <FeatureItem
                    label={t('billing.storageLimit')}
                    value={`${plan.max_storage_mb}MB`}
                  />
                  <FeatureItem
                    label="API"
                    value={plan.has_api_access ? t('billing.available') : t('billing.unavailable')}
                    available={plan.has_api_access}
                  />
                </div>

                {subscription?.plan.id !== plan.id && (
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowUpgradeModal(true);
                    }}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm border-2 border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {t('billing.selectPlan')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-500" />
              {t('billing.invoices')}
            </h3>

            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      invoice.is_paid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {invoice.is_paid ? <Check size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(invoice.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">
                      {formatPrice(invoice.total_amount, invoice.currency)}
                    </p>
                    {invoice.pdf_url && (
                      <button className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <Download size={12} />
                        PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel Subscription */}
        {subscription && subscription.plan.plan_type !== 'free' && subscription.status === 'active' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full py-3 text-red-500 font-semibold text-sm rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
          >
            {t('billing.cancelSubscription')}
          </button>
        )}
      </div>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowUpgradeModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800">
                  {subscription ? t('billing.confirmUpgrade') : t('billing.confirmSubscribe')}
                </h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`rounded-xl p-4 mb-4 ${getPlanColor(selectedPlan.plan_type)}`}>
                <div className="flex items-center gap-3 mb-3">
                  {getPlanIcon(selectedPlan.plan_type)}
                  <div>
                    <h4 className="font-bold text-slate-900">{selectedPlan.name}</h4>
                    <p className="text-xs text-slate-500">{selectedPlan.description}</p>
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-3xl font-bold text-slate-900">
                    {formatPrice(
                      billingCycle === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly,
                      selectedPlan.currency
                    )}
                  </span>
                  <span className="text-slate-500">
                    / {billingCycle === 'yearly' ? t('billing.year') : t('billing.month')}
                  </span>
                </div>
              </div>

              {selectedPlan.trial_days > 0 && !subscription && (
                <div className="bg-green-50 p-3 rounded-lg mb-4 flex items-center gap-2 text-sm text-green-700">
                  <Sparkles size={16} />
                  {t('billing.trialInfo', { days: selectedPlan.trial_days })}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => subscription ? handleUpgrade() : handleSubscribe(selectedPlan)}
                  disabled={isUpgrading}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:bg-slate-300"
                >
                  {isUpgrading ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Check size={18} />
                      {t('billing.confirm')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowCancelModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800">
                  {t('billing.confirmCancel')}
                </h3>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-red-50 p-4 rounded-lg mb-4 border border-red-100">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm text-red-700 font-semibold mb-1">
                      {t('billing.cancelWarningTitle')}
                    </p>
                    <p className="text-xs text-red-600">
                      {t('billing.cancelWarningMessage')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  {t('billing.keepSubscription')}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold"
                >
                  {t('billing.confirmCancelButton')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Usage Bar Component
const UsageBar: React.FC<{
  label: string;
  current: number;
  limit: number | null;
  icon: React.ReactNode;
  unit?: string;
}> = ({ label, current, limit, icon, unit = '' }) => {
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;
  const isWarning = percentage > 80;
  const isExceeded = percentage >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-600 flex items-center gap-1">
          {icon} {label}
        </span>
        <span className={`text-xs font-semibold ${
          isExceeded ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-700'
        }`}>
          {current}{unit} / {limit ? `${limit}${unit}` : 'Unlimited'}
        </span>
      </div>
      {limit && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isExceeded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Feature Item Component
const FeatureItem: React.FC<{
  label: string;
  value: string;
  available?: boolean;
}> = ({ label, value, available = true }) => (
  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold ${available ? 'text-slate-900' : 'text-slate-400'}`}>
      {value}
    </span>
  </div>
);

export default Billing;
