import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileText, Download, Send, RefreshCw, Copy, Check, AlertTriangle, Database } from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';
import { UserProfile } from '../types';
import { useToast } from '../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

interface ContentProofGeneratorProps {
  userProfile?: UserProfile;
  onBack: () => void;
}

export const ContentProofGenerator: React.FC<ContentProofGeneratorProps> = ({ userProfile, onBack }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [step, setStep] = useState<'FORM' | 'GENERATING' | 'RESULT'>('FORM');
  const [formData, setFormData] = useState({
    sender: userProfile?.name || '', // Pre-fill from profile
    receiver: '',
    title: '',
    content: ''
  });
  const [generatedText, setGeneratedText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Update sender if userProfile loads late
  useEffect(() => {
    if (userProfile?.name && !formData.sender) {
        setFormData(prev => ({ ...prev, sender: userProfile.name }));
    }
  }, [userProfile]);

  const handleGenerate = async () => {
    if (!formData.sender || !formData.receiver || !formData.content) return;

    setStep('GENERATING');

    try {
      // Build content for proof generation
      const proofContent = `
[Content Proof Generation Request]
- Sender: ${formData.sender}
- Receiver: ${formData.receiver}
- Title: ${formData.title || 'Contract Breach and Damage Claim'}
- Details: ${formData.content}
- Business Type: ${userProfile?.businessType || 'Not specified'}
- Business Description: ${userProfile?.businessDescription || 'Not specified'}
- Date: ${new Date().toLocaleDateString()}
`;

      // Use backend API for content proof generation
      const response = await fetch(`${API_BASE_URL}/ai/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: proofContent,
          proof_type: 'legal_document',
          metadata: {
            sender: formData.sender,
            receiver: formData.receiver,
            title: formData.title,
            business_type: userProfile?.businessType
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.proof_text) {
        setGeneratedText(result.proof_text);
        setStep('RESULT');
      } else {
        throw new Error(t('contentProof.emptyResponse', 'AI response is empty.'));
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(t('contentProof.generationError', 'An error occurred while generating the document. Please try again.'));
      setStep('FORM');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (step === 'GENERATING') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="mb-4 text-indigo-600"
        >
            <RefreshCw size={40} />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{t('contentProof.generating')}</h3>
        <p className="text-slate-500 text-center text-sm leading-relaxed">
          {t('contentProof.generatingDescription')}
        </p>
      </div>
    );
  }

  if (step === 'RESULT') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
          <button onClick={() => setStep('FORM')} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800">{t('contentProof.preview')}</h2>
          <button 
             onClick={handleCopy}
             className="p-2 rounded-full hover:bg-slate-50 text-slate-600"
          >
             {isCopied ? <Check size={22} className="text-green-600"/> : <Copy size={22} />}
          </button>
        </div>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-100">
          <div className="bg-white p-8 shadow-md border border-slate-200 min-h-[500px] max-w-2xl mx-auto">
            <pre className="font-serif whitespace-pre-wrap text-sm md:text-base leading-relaxed text-slate-800">
              {generatedText}
            </pre>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-100 max-w-2xl mx-auto">
             <AlertTriangle size={14} className="shrink-0 mt-0.5" />
             <p>{t('contentProof.aiDisclaimer')}</p>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex gap-3 max-w-2xl mx-auto w-full">
          <Button variant="outline" fullWidth onClick={() => toast.info('PDF conversion feature will be available soon. Please copy the text to use.')}>
            <Download size={18} /> {t('contentProof.savePdf')}
          </Button>
          <Button fullWidth onClick={() => setStep('FORM')}>
            <FileText size={18} /> {t('contentProof.edit')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center gap-2 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800">{t('contentProof.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <p className="text-sm text-indigo-800 leading-relaxed font-medium">
                <span className="font-bold block mb-1 flex items-center gap-1"><Database size={14} /> {t('contentProof.personalized')}</span>
                {userProfile?.businessType ? (
                    t('contentProof.profileHintWithBusiness', { businessType: userProfile.businessType })
                ) : (
                    t('contentProof.profileHint')
                )}
            </p>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto">
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contentProof.sender')}</label>
                <input
                    type="text"
                    value={formData.sender}
                    onChange={(e) => setFormData({...formData, sender: e.target.value})}
                    placeholder={t('contentProof.senderPlaceholder')}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contentProof.receiver')}</label>
                <input
                    type="text"
                    value={formData.receiver}
                    onChange={(e) => setFormData({...formData, receiver: e.target.value})}
                    placeholder={t('contentProof.receiverPlaceholder')}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contentProof.subject')}</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder={t('contentProof.subjectPlaceholder')}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contentProof.content')}</label>
                <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder={t('contentProof.contentPlaceholder')}
                    className="w-full h-48 bg-white border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none resize-none transition-colors"
                />
            </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <Button fullWidth onClick={handleGenerate} disabled={!formData.sender || !formData.receiver || !formData.content} className="max-w-2xl mx-auto">
            <Send size={18} /> {t('contentProof.generate')}
        </Button>
      </div>
    </div>
  );
};