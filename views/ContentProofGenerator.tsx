import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileText, Download, Send, RefreshCw, Copy, Check, AlertTriangle, Database } from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import { UserProfile } from '../types';

interface ContentProofGeneratorProps {
  userProfile?: UserProfile;
  onBack: () => void;
}

export const ContentProofGenerator: React.FC<ContentProofGeneratorProps> = ({ userProfile, onBack }) => {
  const { t } = useTranslation();
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Inject RAG Context
      let userContext = "";
      if (userProfile) {
          userContext = `
          [SENDER CONTEXT]
          - Business Type: ${userProfile.businessType}
          - Business Description: ${userProfile.businessDescription}
          Note: Ensure the tone and vocabulary matches the sender's professional background.
          `;
      }

      const prompt = `
당신은 20년 경력의 법률 전문가입니다. 사용자가 제공한 정보를 바탕으로 법적 효력이 있는 '내용증명(Content Proof)'을 작성해 주세요.

${userContext}

[입력 정보]
- 발신인: ${formData.sender}
- 수신인: ${formData.receiver}
- 제목: ${formData.title || '계약 불이행 및 손해배상 청구의 건'}
- 상세 상황(사실 관계): ${formData.content}

[작성 가이드]
1. 문체는 정중하지만 단호한 법률적 어조를 사용하세요.
2. 문서 형식:
   - 문서 상단에 [내용증명] 표기
   - 수신인 및 발신인 정보 (성명/상호, 주소란은 공란으로 '[주소 기입 필요]'라고 표시)
   - 제목
   - 본문:
     1) 귀하(귀사)의 무궁한 발전을 기원합니다.
     2) 사실 관계 진술 (육하원칙에 의거하여 명확하게)
     3) 요구 사항 (이행 촉구)
     4) 불이행 시 법적 조치 예고 (민형사상 책임 등)
   - 결어
   - 작성일자 (오늘 날짜: ${new Date().toLocaleDateString()})
   - 발신인 서명란
3. Markdown 형식이 아닌 순수 텍스트 형식으로 출력해 주세요.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (response.text) {
        setGeneratedText(response.text);
        setStep('RESULT');
      } else {
        throw new Error(t('contentProof.emptyResponse', 'AI response is empty.'));
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert(t('contentProof.generationError', 'An error occurred while generating the document. Please try again.'));
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
          <Button variant="outline" fullWidth onClick={() => alert('PDF conversion feature will be available soon. Please copy the text to use.')}>
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