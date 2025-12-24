import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader,
  ArrowLeft,
  Code2,
  Webhook,
  BarChart3,
  Clock,
  Eye,
  EyeOff,
  ChevronDown,
  ExternalLink,
  Terminal,
  RefreshCw,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
  b2bApi,
  APIKey,
  APIKeyCreateResponse,
  WebhookConfig,
  B2BUsage
} from '../services/api';

interface DeveloperPortalProps {
  onBack: () => void;
}

const AVAILABLE_SCOPES = [
  { id: 'contracts:read', label: 'Read Contracts', description: 'View contract details' },
  { id: 'contracts:write', label: 'Create Contracts', description: 'Create and modify contracts' },
  { id: 'analysis:read', label: 'AI Analysis', description: 'Run contract analysis' },
  { id: 'signatures:read', label: 'Read Signatures', description: 'View signature status' },
  { id: 'signatures:write', label: 'Create Signatures', description: 'Sign contracts' },
  { id: 'blockchain:read', label: 'Blockchain Read', description: 'View blockchain anchors' },
  { id: 'blockchain:write', label: 'Blockchain Write', description: 'Create blockchain anchors' }
];

const WEBHOOK_EVENTS = [
  { id: 'contract.created', label: 'Contract Created' },
  { id: 'contract.analyzed', label: 'Analysis Complete' },
  { id: 'signature.completed', label: 'Signature Completed' },
  { id: 'blockchain.anchored', label: 'Blockchain Anchored' }
];

export const DeveloperPortal: React.FC<DeveloperPortalProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'keys' | 'webhooks' | 'docs'>('keys');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [usage, setUsage] = useState<B2BUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Key Modal
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['contracts:read', 'analysis:read']);
  const [newKeyExpiry, setNewKeyExpiry] = useState(365);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Create Webhook Modal
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);

  // Key visibility
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [keysData, webhooksData] = await Promise.all([
        b2bApi.listApiKeys().catch(() => []),
        b2bApi.listWebhooks().catch(() => [])
      ]);

      setApiKeys(keysData);
      setWebhooks(webhooksData);
    } catch (error) {
      console.error('Failed to load developer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      addToast({ message: t('devPortal.keyNameRequired'), type: 'error' });
      return;
    }

    setIsCreatingKey(true);
    try {
      const result = await b2bApi.createApiKey({
        name: newKeyName,
        scopes: newKeyScopes,
        expires_in_days: newKeyExpiry
      });

      setCreatedKey(result.api_key);
      await loadData();
      addToast({ message: t('devPortal.keyCreated'), type: 'success' });
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('devPortal.keyCreateError'),
        type: 'error'
      });
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm(t('devPortal.confirmRevokeKey'))) return;

    try {
      await b2bApi.revokeApiKey(keyId);
      await loadData();
      addToast({ message: t('devPortal.keyRevoked'), type: 'success' });
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('devPortal.keyRevokeError'),
        type: 'error'
      });
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) {
      addToast({ message: t('devPortal.webhookUrlRequired'), type: 'error' });
      return;
    }

    if (webhookEvents.length === 0) {
      addToast({ message: t('devPortal.webhookEventsRequired'), type: 'error' });
      return;
    }

    setIsCreatingWebhook(true);
    try {
      await b2bApi.createWebhook({
        url: webhookUrl,
        events: webhookEvents
      });

      await loadData();
      setShowWebhookModal(false);
      setWebhookUrl('');
      setWebhookEvents([]);
      addToast({ message: t('devPortal.webhookCreated'), type: 'success' });
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('devPortal.webhookCreateError'),
        type: 'error'
      });
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm(t('devPortal.confirmDeleteWebhook'))) return;

    try {
      await b2bApi.deleteWebhook(webhookId);
      await loadData();
      addToast({ message: t('devPortal.webhookDeleted'), type: 'success' });
    } catch (error: any) {
      addToast({
        message: error?.details?.detail || t('devPortal.webhookDeleteError'),
        type: 'error'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ message: t('devPortal.copiedToClipboard'), type: 'success' });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 size={20} className="text-emerald-400" />
              {t('devPortal.title')}
            </h1>
            <p className="text-xs text-slate-400">{t('devPortal.subtitle')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1">
          <TabButton
            active={activeTab === 'keys'}
            onClick={() => setActiveTab('keys')}
            icon={<Key size={16} />}
            label={t('devPortal.apiKeys')}
          />
          <TabButton
            active={activeTab === 'webhooks'}
            onClick={() => setActiveTab('webhooks')}
            icon={<Webhook size={16} />}
            label={t('devPortal.webhooks')}
          />
          <TabButton
            active={activeTab === 'docs'}
            onClick={() => setActiveTab('docs')}
            icon={<Terminal size={16} />}
            label={t('devPortal.docs')}
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* API Keys Tab */}
        {activeTab === 'keys' && (
          <>
            <button
              onClick={() => {
                setNewKeyName('');
                setNewKeyScopes(['contracts:read', 'analysis:read']);
                setNewKeyExpiry(365);
                setCreatedKey(null);
                setShowCreateKeyModal(true);
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <Plus size={18} />
              {t('devPortal.createApiKey')}
            </button>

            {apiKeys.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <Key size={48} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  {t('devPortal.noApiKeys')}
                </h3>
                <p className="text-sm text-slate-500">
                  {t('devPortal.noApiKeysDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="bg-slate-800 rounded-xl p-4 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">{key.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded font-mono">
                            {key.key_prefix}
                          </code>
                          {key.is_active ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                              Revoked
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {key.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded-full"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {t('devPortal.created')}: {new Date(key.created_at).toLocaleDateString()}
                      </span>
                      {key.last_used_at && (
                        <span>
                          {t('devPortal.lastUsed')}: {new Date(key.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <>
            <button
              onClick={() => {
                setWebhookUrl('');
                setWebhookEvents([]);
                setShowWebhookModal(true);
              }}
              className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
            >
              <Plus size={18} />
              {t('devPortal.createWebhook')}
            </button>

            {webhooks.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <Webhook size={48} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-300 mb-2">
                  {t('devPortal.noWebhooks')}
                </h3>
                <p className="text-sm text-slate-500">
                  {t('devPortal.noWebhooksDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="bg-slate-800 rounded-xl p-4 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 overflow-hidden">
                        <code className="text-sm text-emerald-400 font-mono truncate block">
                          {webhook.url}
                        </code>
                        <div className="flex items-center gap-2 mt-1">
                          {webhook.is_active ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Terminal size={18} className="text-emerald-400" />
                {t('devPortal.quickStart')}
              </h3>

              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                <div className="text-slate-500 mb-2"># {t('devPortal.exampleRequest')}</div>
                <div className="text-emerald-400">curl</div>
                <div className="text-white ml-2">-X GET \</div>
                <div className="text-white ml-2">-H "X-API-Key: sc_live_..." \</div>
                <div className="text-amber-400 ml-2">"https://trendy.storydot.kr/law/api/b2b/contracts"</div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Shield size={18} className="text-blue-400" />
                {t('devPortal.authentication')}
              </h3>

              <p className="text-sm text-slate-400 mb-3">
                {t('devPortal.authDescription')}
              </p>

              <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs">
                <span className="text-slate-500">Header: </span>
                <span className="text-amber-400">X-API-Key: </span>
                <span className="text-emerald-400">your_api_key_here</span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="font-bold text-white mb-3">{t('devPortal.endpoints')}</h3>

              <div className="space-y-2">
                <EndpointItem
                  method="GET"
                  path="/b2b/contracts"
                  description={t('devPortal.endpointListContracts')}
                />
                <EndpointItem
                  method="POST"
                  path="/b2b/contracts"
                  description={t('devPortal.endpointCreateContract')}
                />
                <EndpointItem
                  method="POST"
                  path="/b2b/analyze"
                  description={t('devPortal.endpointAnalyze')}
                />
                <EndpointItem
                  method="GET"
                  path="/b2b/usage"
                  description={t('devPortal.endpointUsage')}
                />
              </div>
            </div>

            <a
              href="https://trendy.storydot.kr/law/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 transition-colors"
            >
              <ExternalLink size={16} />
              {t('devPortal.viewFullDocs')}
            </a>
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      <AnimatePresence>
        {showCreateKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !createdKey && setShowCreateKeyModal(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10 max-h-[90vh] overflow-y-auto border border-slate-700"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-api-key-title"
            >
              {!createdKey ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 id="create-api-key-title" className="font-bold text-lg text-white">
                      {t('devPortal.createApiKey')}
                    </h3>
                    <button
                      onClick={() => setShowCreateKeyModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        {t('devPortal.keyName')}
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder={t('devPortal.keyNamePlaceholder')}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 px-3 text-sm text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">
                        {t('devPortal.scopes')}
                      </label>
                      <div className="space-y-2">
                        {AVAILABLE_SCOPES.map((scope) => (
                          <label
                            key={scope.id}
                            className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={newKeyScopes.includes(scope.id)}
                              onChange={() => toggleScope(scope.id)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div>
                              <p className="text-sm font-medium text-white">{scope.label}</p>
                              <p className="text-xs text-slate-500">{scope.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5">
                        {t('devPortal.expiry')}
                      </label>
                      <select
                        value={newKeyExpiry}
                        onChange={(e) => setNewKeyExpiry(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 px-3 text-sm text-white focus:border-emerald-500 outline-none"
                      >
                        <option value={30}>30 days</option>
                        <option value={90}>90 days</option>
                        <option value={365}>1 year</option>
                        <option value={730}>2 years</option>
                      </select>
                    </div>

                    <button
                      onClick={handleCreateKey}
                      disabled={isCreatingKey || !newKeyName.trim()}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:bg-slate-600"
                    >
                      {isCreatingKey ? (
                        <Loader className="animate-spin" size={18} />
                      ) : (
                        <>
                          <Key size={18} />
                          {t('devPortal.generateKey')}
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check size={32} className="text-emerald-400" />
                    </div>
                    <h3 className="font-bold text-lg text-white mb-2">
                      {t('devPortal.keyCreatedTitle')}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {t('devPortal.keyCreatedMessage')}
                    </p>
                  </div>

                  <div className="bg-slate-900 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 font-bold uppercase">
                        {t('devPortal.yourApiKey')}
                      </span>
                      <button
                        onClick={() => copyToClipboard(createdKey)}
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs"
                      >
                        <Copy size={12} />
                        {t('devPortal.copy')}
                      </button>
                    </div>
                    <code className="text-sm text-emerald-400 font-mono break-all block">
                      {createdKey}
                    </code>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        {t('devPortal.keySecurityWarning')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCreatedKey(null);
                      setShowCreateKeyModal(false);
                    }}
                    className="w-full py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-colors"
                  >
                    {t('common.done')}
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Webhook Modal */}
      <AnimatePresence>
        {showWebhookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWebhookModal(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10 border border-slate-700"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-webhook-title"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 id="create-webhook-title" className="font-bold text-lg text-white">
                  {t('devPortal.createWebhook')}
                </h3>
                <button
                  onClick={() => setShowWebhookModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">
                    {t('devPortal.webhookUrl')}
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl py-3 px-3 text-sm text-white focus:border-purple-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">
                    {t('devPortal.events')}
                  </label>
                  <div className="space-y-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <label
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={webhookEvents.includes(event.id)}
                          onChange={() => toggleWebhookEvent(event.id)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-white">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCreateWebhook}
                  disabled={isCreatingWebhook || !webhookUrl.trim() || webhookEvents.length === 0}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:bg-slate-600"
                >
                  {isCreatingWebhook ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Webhook size={18} />
                      {t('devPortal.saveWebhook')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Tab Button Component
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
      active
        ? 'text-emerald-400 border-emerald-400'
        : 'text-slate-400 border-transparent hover:text-slate-300'
    }`}
  >
    {icon}
    {label}
  </button>
);

// Endpoint Item Component
const EndpointItem: React.FC<{
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
}> = ({ method, path, description }) => {
  const methodColors = {
    GET: 'bg-emerald-500/20 text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400'
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg">
      <span className={`text-xs font-bold px-2 py-1 rounded ${methodColors[method]}`}>
        {method}
      </span>
      <div className="flex-1">
        <code className="text-sm text-slate-300 font-mono">{path}</code>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
};

export default DeveloperPortal;
