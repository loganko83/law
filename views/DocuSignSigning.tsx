import React, { useState, useEffect, useRef } from 'react';
import { Contract } from '../types';
import { X, ArrowDown, Check, MousePointer2, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { signaturesApi, didApi, ContractSignature } from '../services/api';
import { useToast } from '../components/Toast';

interface DocuSignSigningProps {
  contract: Contract;
  onSigned: () => void;
  onCancel: () => void;
}

type SignatureType = 'draw' | 'type';

export const DocuSignSigning: React.FC<DocuSignSigningProps> = ({ contract, onSigned, onCancel }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<'LOADING' | 'DID_CHECK' | 'AGREE' | 'SIGNING' | 'COMPLETING' | 'SUCCESS'>('LOADING');
  const [signatureType, setSignatureType] = useState<SignatureType>('draw');
  const [typedName, setTypedName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [documentHash, setDocumentHash] = useState<string>('');
  const [didStatus, setDidStatus] = useState<string>('none');
  const [loading, setLoading] = useState(false);
  const [signatureResponse, setSignatureResponse] = useState<ContractSignature | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    checkDIDAndPrepare();
  }, []);

  const checkDIDAndPrepare = async () => {
    try {
      setStep('DID_CHECK');

      // Check DID status
      const didData = await didApi.getStatus();
      setDidStatus(didData.status);

      if (didData.status !== 'confirmed') {
        toast.error(t('sign.didNotConfirmed') || 'DID is not confirmed. Please complete DID verification first.');
        setTimeout(() => onCancel(), 3000);
        return;
      }

      // Calculate document hash
      const hash = await calculateDocumentHash(contract.content || '');
      setDocumentHash(hash);

      // Proceed to agreement step
      setTimeout(() => {
        setStep('AGREE');
      }, 800);

    } catch (error: any) {
      console.error('DID check failed:', error);
      toast.error(error.message || 'Failed to verify DID status');
      setTimeout(() => onCancel(), 3000);
    }
  };

  const calculateDocumentHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleAgreement = () => {
    setStep('SIGNING');
    // Initialize canvas for drawing
    setTimeout(() => initCanvas(), 100);
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing style
    ctx.strokeStyle = '#1e2432';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (loading) return;

    try {
      setLoading(true);

      let signatureData = '';

      if (signatureType === 'draw') {
        if (!hasDrawn) {
          toast.error(t('sign.pleaseDrawSignature') || 'Please draw your signature');
          setLoading(false);
          return;
        }
        // Convert canvas to base64
        const canvas = canvasRef.current;
        if (canvas) {
          signatureData = canvas.toDataURL('image/png');
        }
      } else if (signatureType === 'type') {
        if (!typedName.trim()) {
          toast.error(t('sign.pleaseEnterName') || 'Please enter your name');
          setLoading(false);
          return;
        }
        signatureData = typedName.trim();
      }

      // Call signature API
      const response = await signaturesApi.sign({
        contract_id: contract.id,
        signature_type: signatureType,
        signature_data: signatureData,
        document_hash: documentHash,
      });

      setSignatureResponse(response);
      setStep('COMPLETING');

      toast.success(t('sign.signatureCreated') || 'Signature created successfully!');

      // Auto-transition to success screen
      setTimeout(() => {
        setStep('SUCCESS');
      }, 2000);

    } catch (error: any) {
      console.error('Signature failed:', error);
      toast.error(error.message || 'Failed to create signature');
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signatureResponse || loading) return;

    try {
      setLoading(true);
      const result = await signaturesApi.verify(signatureResponse.id);
      setVerificationResult(result);
      toast.success(result.valid ? t('sign.verificationSuccess') || 'Signature verified successfully!' : t('sign.verificationFailed') || 'Signature verification failed');
    } catch (error: any) {
      console.error('Verification failed:', error);
      toast.error(error.message || 'Failed to verify signature');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onSigned();
  };

  if (step === 'LOADING' || step === 'DID_CHECK') {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100">
            <div className="bg-white p-8 rounded-lg shadow-sm flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#005cb9] border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-[#1e2432] font-semibold text-lg">
                  {step === 'DID_CHECK' ? (t('sign.checkingDID') || 'Verifying DID...') : t('sign.loadingDocuSign')}
                </h3>
                <p className="text-slate-500 text-sm mt-2">
                  {step === 'DID_CHECK' ? (t('sign.verifyingIdentity') || 'Verifying your identity') : t('sign.securingConnection')}
                </p>
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
                <h2 className="text-2xl font-bold mb-2">{t('sign.processing')}</h2>
                <p className="text-slate-300">{t('sign.creatingCredential')}</p>
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mt-8"></div>
            </motion.div>
        </div>
      );
  }

  if (step === 'SUCCESS') {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <header className="bg-[#1e2432] text-white px-4 py-3 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="font-bold text-xl tracking-tight">SafeContract</div>
          </div>
          <button onClick={handleFinish} className="p-2 text-slate-300 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full"
          >
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                <Check size={40} strokeWidth={3} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-[#1e2432] mb-2">{t('sign.signatureComplete')}</h2>
              <p className="text-slate-600 text-center">{t('sign.credentialIssued')}</p>
            </div>

            {signatureResponse && (
              <div className="space-y-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="font-semibold text-[#1e2432] mb-3 flex items-center gap-2">
                    <Shield size={18} className="text-green-600" />
                    {t('sign.signatureDetails')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('sign.signatureId')}:</span>
                      <span className="font-mono text-xs">{signatureResponse.id.substring(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('sign.signerDID')}:</span>
                      <span className="font-mono text-xs">{signatureResponse.signer_did.substring(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('sign.documentHash')}:</span>
                      <span className="font-mono text-xs">{documentHash.substring(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('sign.status')}:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                        {signatureResponse.status}
                      </span>
                    </div>
                    {signatureResponse.credential_id && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">{t('sign.credentialId')}:</span>
                        <span className="font-mono text-xs">{signatureResponse.credential_id.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                </div>

                {signatureResponse.credential && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-[#1e2432] mb-2">{t('sign.w3cCredential')}</h3>
                    <pre className="text-xs overflow-auto max-h-40 bg-white p-3 rounded border border-blue-100">
                      {JSON.stringify(signatureResponse.credential, null, 2)}
                    </pre>
                  </div>
                )}

                <button
                  onClick={handleVerify}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {t('sign.verifying')}
                    </>
                  ) : (
                    <>
                      <Shield size={18} />
                      {t('sign.verifySignature')}
                    </>
                  )}
                </button>

                {verificationResult && (
                  <div className={`rounded-xl p-4 border ${verificationResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      {verificationResult.valid ? (
                        <>
                          <Check size={18} className="text-green-600" />
                          <span className="text-green-800">{t('sign.verificationSuccess')}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} className="text-red-600" />
                          <span className="text-red-800">{t('sign.verificationFailed')}</span>
                        </>
                      )}
                    </h3>
                    <p className="text-sm text-slate-700">{verificationResult.message}</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleFinish}
              className="w-full bg-[#ffc820] hover:bg-[#e0b01c] text-[#1e2432] font-bold py-3 rounded-lg transition-colors"
            >
              {t('sign.returnToContract')}
            </button>
          </motion.div>
        </div>
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
                {t('sign.sentBy')}
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
                        const signArea = document.getElementById('signature-area');
                        signArea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="bg-[#005cb9] text-white px-4 py-1.5 rounded-sm text-sm font-bold shadow-sm hover:bg-[#004c99] flex items-center gap-2"
                 >
                     <ArrowDown size={14} /> {t('sign.start')}
                 </button>
              </div>
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
                        <h2 className="text-2xl font-bold text-[#1e2432] mb-4">{t('sign.agreementTitle')}</h2>
                        <div className="flex-1 overflow-y-auto border border-slate-200 p-4 text-sm text-slate-600 mb-6 bg-slate-50">
                            <p className="mb-4">
                                {t('sign.agreementText')}
                            </p>
                            <p>
                                {t('sign.termsDetails')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <input type="checkbox" id="agree" className="w-5 h-5 accent-[#005cb9]" onChange={() => {}} />
                            <label htmlFor="agree" className="text-[#1e2432] font-semibold text-sm">
                                {t('sign.agreeToTerms')}
                            </label>
                        </div>
                        <button
                            onClick={handleAgreement}
                            className="w-full md:w-auto bg-[#ffc820] text-[#1e2432] px-8 py-3 rounded-sm font-bold text-lg hover:bg-[#e0b01c] transition-colors"
                        >
                            {t('sign.continue')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document Content */}
            <div className="font-serif text-slate-800 leading-relaxed whitespace-pre-wrap select-none">
                {contract.content || t('common.noContent')}
            </div>

            {/* Signature Area */}
            <div id="signature-area" className="mt-20 border-t border-slate-300 pt-10">
                <h3 className="text-xl font-bold text-[#1e2432] mb-6">{t('sign.title')}</h3>

                {/* Signature Type Selection */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => setSignatureType('draw')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      signatureType === 'draw'
                        ? 'bg-[#005cb9] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('sign.draw')}
                  </button>
                  <button
                    onClick={() => setSignatureType('type')}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                      signatureType === 'type'
                        ? 'bg-[#005cb9] text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('sign.type')}
                  </button>
                </div>

                {/* Draw Signature */}
                {signatureType === 'draw' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">{t('sign.drawPrompt')}</p>
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-48 border-2 border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
                    />
                    <button
                      onClick={clearCanvas}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {t('sign.clear')}
                    </button>
                  </div>
                )}

                {/* Type Signature */}
                {signatureType === 'type' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">{t('sign.typePrompt')}</p>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder={contract.partyName || t('sign.yourName')}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg text-xl font-script focus:outline-none focus:border-[#005cb9]"
                    />
                    {typedName && (
                      <div className="text-center py-4 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-3xl font-script text-[#1e2432]">{typedName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-3 mt-6 mb-4">
                  <input
                    type="checkbox"
                    id="sign-agreement"
                    className="w-5 h-5 mt-1 accent-[#005cb9]"
                  />
                  <label htmlFor="sign-agreement" className="text-sm text-slate-700">
                    {t('sign.agreement')}
                  </label>
                </div>

                {/* Sign Button */}
                <button
                  onClick={handleSign}
                  disabled={loading || (signatureType === 'draw' && !hasDrawn) || (signatureType === 'type' && !typedName.trim())}
                  className="w-full bg-[#ffc820] hover:bg-[#e0b01c] disabled:bg-slate-300 disabled:cursor-not-allowed text-[#1e2432] font-bold py-4 rounded-lg transition-all shadow-md disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-3 border-[#1e2432] border-t-transparent rounded-full animate-spin"></div>
                      {t('sign.signing')}
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      {t('sign.confirm')}
                    </>
                  )}
                </button>

                <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
                  <span>{t('sign.signer')}: {contract.partyName || "User"}</span>
                  <span>{t('common.date')}: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
         </div>
         <div className="h-20"></div> {/* Bottom Spacer */}
      </div>
    </div>
  );
};
