import React, { useState, useEffect } from 'react';
import { Contract } from '../types';
import { X, ArrowDown, Check, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DocuSignSigningProps {
  contract: Contract;
  onSigned: () => void;
  onCancel: () => void;
}

export const DocuSignSigning: React.FC<DocuSignSigningProps> = ({ contract, onSigned, onCancel }) => {
  const [step, setStep] = useState<'LOADING' | 'AGREE' | 'SIGNING' | 'COMPLETING'>('LOADING');
  const [signed, setSigned] = useState(false);
  const [signaturePos, setSignaturePos] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    // Simulate initial loading of DocuSign Envelope
    const timer = setTimeout(() => {
      setStep('AGREE');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAgreement = () => {
    setStep('SIGNING');
  };

  const handleSign = () => {
    setSigned(true);
    // Simulate signature placement animation
  };

  const handleFinish = () => {
    if (!signed) return;
    setStep('COMPLETING');
    setTimeout(() => {
        onSigned();
    }, 2000);
  };

  if (step === 'LOADING') {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
            <div className="bg-white p-8 rounded-lg shadow-sm flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#005cb9] border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-[#1e2432] font-semibold text-lg">DocuSign 불러오는 중...</h3>
                <p className="text-slate-500 text-sm mt-2">보안 연결을 설정하고 있습니다.</p>
            </div>
        </div>
    );
  }

  if (step === 'COMPLETING') {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#1e2432] text-white">
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
            >
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/50">
                    <Check size={40} strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold mb-2">서명 완료!</h2>
                <p className="text-slate-300">문서가 성공적으로 서명되었습니다.</p>
                <p className="text-slate-400 text-sm mt-8">잠시 후 앱으로 돌아갑니다...</p>
            </motion.div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f4f4f4] relative overflow-hidden font-sans">
      {/* DocuSign Header */}
      <header className="bg-[#1e2432] text-white px-4 py-3 flex justify-between items-center shadow-md z-30">
        <div className="flex items-center gap-3">
            {/* Logo Mock */}
            <div className="font-bold text-xl tracking-tight">DocuSign</div>
            <div className="h-6 w-px bg-slate-600 mx-2 hidden md:block"></div>
            <div className="text-xs md:text-sm text-slate-300 hidden md:block">
                안심 계약 케어 서비스님이 보냄
            </div>
        </div>
        <div className="flex items-center gap-3">
             <button 
                onClick={onCancel}
                className="p-2 text-slate-300 hover:text-white transition-colors"
             >
                 <X size={20} />
             </button>
        </div>
      </header>

      {/* Action Bar */}
      {step === 'SIGNING' && (
          <div className="bg-[#e9e9e9] border-b border-[#d9d9d9] px-4 py-2 flex justify-between items-center sticky top-0 z-20">
              <div className="flex items-center gap-2">
                 <button 
                    onClick={() => {
                        const signBtn = document.getElementById('sign-button');
                        signBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="bg-[#005cb9] text-white px-4 py-1.5 rounded-sm text-sm font-bold shadow-sm hover:bg-[#004c99] flex items-center gap-2"
                 >
                     <ArrowDown size={14} /> 시작
                 </button>
                 <span className="text-xs text-slate-600 hidden sm:inline">
                     {signed ? '서명 완료. 완료 버튼을 눌러주세요.' : '시작 버튼을 눌러 서명 위치로 이동하세요.'}
                 </span>
              </div>
              <button 
                onClick={handleFinish}
                disabled={!signed}
                className={`px-6 py-1.5 rounded-sm text-sm font-bold transition-all ${signed ? 'bg-[#ffc820] text-[#1e2432] shadow-sm hover:bg-[#e0b01c]' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
              >
                  완료
              </button>
          </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-[#5a6476]">
         <div className="w-full max-w-3xl bg-white shadow-2xl min-h-[1000px] p-8 md:p-12 relative">
            {/* Agreement Overlay */}
            <AnimatePresence>
                {step === 'AGREE' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-white/95 z-40 flex flex-col p-8"
                    >
                        <h2 className="text-2xl font-bold text-[#1e2432] mb-4">전자 기록 및 서명 사용 동의</h2>
                        <div className="flex-1 overflow-y-auto border border-slate-200 p-4 text-sm text-slate-600 mb-6 bg-slate-50">
                            <p className="mb-4">
                                본 문서를 전자적으로 수신하고 서명하는 데 동의합니다. 귀하는 언제든지 동의를 철회할 수 있습니다.
                            </p>
                            <p>
                                [상세 약관 내용 생략...]
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <input type="checkbox" id="agree" className="w-5 h-5 accent-[#005cb9]" onChange={() => {}} />
                            <label htmlFor="agree" className="text-[#1e2432] font-semibold text-sm">
                                전자 기록 및 서명 사용에 동의합니다.
                            </label>
                        </div>
                        <button 
                            onClick={handleAgreement}
                            className="w-full md:w-auto bg-[#ffc820] text-[#1e2432] px-8 py-3 rounded-sm font-bold text-lg hover:bg-[#e0b01c] transition-colors"
                        >
                            계속하기
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document Content */}
            <div className="font-serif text-slate-800 leading-relaxed whitespace-pre-wrap select-none">
                {contract.content || "문서 내용이 없습니다."}
            </div>
            
            {/* Signature Area */}
            <div className="mt-20 border-t border-slate-300 pt-10">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold">서명: ________________________</span>
                        <span className="text-xs text-slate-500">서명인: {contract.partyName || "홍길동"}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        <span className="text-sm font-bold">날짜: {new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Interactive Sign Button */}
                <div id="sign-button" className="relative mt-8 h-20">
                     {!signed ? (
                         <motion.button
                            initial={{ scale: 0.9 }}
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            onClick={handleSign}
                            className="absolute left-0 top-0 bg-[#ffc820] text-[#1e2432] px-4 py-2 rounded-sm font-bold shadow-md hover:bg-[#e0b01c] flex items-center gap-2 group"
                         >
                             <div className="bg-[#1e2432] text-white p-1 rounded-sm">
                                <ArrowDown size={14} />
                             </div>
                             서명하기
                             <MousePointer2 size={16} className="absolute -right-6 top-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                         </motion.button>
                     ) : (
                         <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute left-0 top-[-20px]"
                         >
                             <div className="font-script text-3xl text-[#1e2432] transform -rotate-2 p-2 border-2 border-dashed border-[#1e2432]/30 rounded bg-blue-50/50">
                                 {contract.partyName || "홍길동"} (서명)
                             </div>
                             <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                 DocuSigned by: {Math.random().toString(36).substr(2, 10).toUpperCase()}
                             </div>
                         </motion.div>
                     )}
                </div>
            </div>
         </div>
         <div className="h-20"></div> {/* Bottom Spacer */}
      </div>
    </div>
  );
};
