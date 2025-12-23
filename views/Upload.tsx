import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Camera, Upload as UploadIcon, FileText, X, ChevronLeft, ScanLine, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContractAnalysis, UserProfile } from '../types';
import { analyzeContract } from '../services/contractAnalysis';
import { useToast } from '../components/Toast';

interface UploadProps {
  onAnalyze: (analysis: ContractAnalysis, contractText: string) => void;
  onCancel: () => void;
  userProfile?: UserProfile;
}

export const Upload: React.FC<UploadProps> = ({ onAnalyze, onCancel, userProfile }) => {
  const toast = useToast();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Attach stream to video element when camera opens
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error(t('upload.cameraError', 'Cannot access camera. Please check permissions.'));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        // Stop stream immediately after capture to save resources
        if (cameraStream) {
           cameraStream.getTracks().forEach(track => track.stop());
        }
      }
    }
  };

  const retakePhoto = async () => {
    setCapturedImage(null);
    // Restart camera
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setCameraStream(stream);
      } catch (err) {
        console.error("Error restarting camera:", err);
      }
  };

  const confirmPhoto = async () => {
    if (capturedImage) {
      try {
        // Convert DataURL to File
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], "scanned-contract.jpg", { type: "image/jpeg" });
        setFile(file);
        setCapturedImage(null);
        setCameraStream(null);
        setIsCameraOpen(false);
      } catch (err) {
        console.error("Error converting captured image:", err);
        toast.error(t('upload.imageConversionError', 'Failed to process the captured image. Please try again.'));
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (!file) return;
    setIsScanning(true);
    setError(null);
    setAnalysisProgress(t('upload.processing'));

    try {
      // Step 1: Extract text from file
      setAnalysisProgress(t('upload.extractingText'));
      let contractText = '';

      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        // Plain text file
        contractText = await file.text();
      } else if (file.type === 'application/pdf') {
        // For PDF, we'll use a simplified text extraction
        // In production, use pdf.js or server-side extraction
        setAnalysisProgress(t('upload.processingPdf', 'Processing PDF...'));
        // Placeholder: read as text for demo
        contractText = await file.text().catch(() => '');
        if (!contractText) {
          // If PDF text extraction fails, use demo text
          contractText = `This is a placeholder for PDF content from: ${file.name}.
          In production, this would be extracted using pdf.js or OCR.
          For testing, please upload a .txt file with contract text.`;
        }
      } else if (file.type.startsWith('image/')) {
        // For images, we would use OCR
        setAnalysisProgress(t('upload.processingImage', 'Processing image...'));
        // Placeholder for OCR
        contractText = `Image contract from: ${file.name}.
        In production, this would be processed with Tesseract.js OCR.
        For testing, please upload a .txt file with contract text.`;
      } else {
        // Try to read as text
        contractText = await file.text().catch(() => '');
      }

      if (!contractText || contractText.length < 50) {
        throw new Error(t('upload.extractionError', 'Could not extract sufficient text from the document. Please try a different file format.'));
      }

      // Step 2: Build user context for personalized analysis
      let userContext = '';
      if (userProfile) {
        userContext = `User is a ${userProfile.businessType}.
        Business: ${userProfile.businessDescription}
        Known concerns: ${userProfile.legalConcerns}`;
      }

      // Step 3: Run AI analysis
      setAnalysisProgress(t('upload.aiAnalyzing'));
      const analysis = await analyzeContract(contractText, userContext, false);

      // Step 4: Return results
      setAnalysisProgress(t('upload.complete'));
      onAnalyze(analysis, contractText);

    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : t('upload.analysisError', 'Analysis failed. Please try again.'));
      setIsScanning(false);
    }
  };

  // 1. Scanning Animation View
  if (isScanning) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-blue-500/10 z-0"
        />

        {/* Scanning Effect */}
        <div className="relative w-64 h-80 border-2 border-blue-500/50 rounded-2xl overflow-hidden mb-8 z-10 bg-slate-800/50 backdrop-blur">
           <div className="absolute inset-0 flex items-center justify-center">
             <FileText size={64} className="text-slate-600" />
           </div>
           <motion.div
             className="absolute top-0 left-0 right-0 h-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)]"
             animate={{ top: ['0%', '100%', '0%'] }}
             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           />
           <div className="absolute bottom-4 left-0 right-0 text-center">
             <p className="text-xs text-blue-300 font-mono">{analysisProgress || t('upload.processing')}</p>
           </div>
        </div>

        <h2 className="text-2xl font-bold mb-2 z-10">{t('upload.analyzing')}</h2>
        <p className="text-slate-400 text-center z-10 max-w-xs">
          {analysisProgress || t('upload.analyzingDescription')}
        </p>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 z-10 max-w-sm">
            <p className="text-red-300 text-sm text-center">{error}</p>
            <button
              onClick={() => { setIsScanning(false); setError(null); }}
              className="mt-2 w-full py-2 bg-red-500/30 rounded-lg text-red-200 text-sm hover:bg-red-500/40"
            >
              {t('upload.tryAgain')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Camera View
  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="flex justify-between items-center p-4 text-white z-10">
            <button onClick={stopCamera} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
                <X size={24} />
            </button>
            <span className="font-semibold">{t('upload.contractScan')}</span>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
            {!capturedImage ? (
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <img 
                    src={capturedImage} 
                    alt="Captured" 
                    className="absolute inset-0 w-full h-full object-contain bg-black" 
                />
            )}
            
            {/* Guide overlay */}
            {!capturedImage && (
                <div className="absolute inset-8 border-2 border-white/30 rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>
            )}
        </div>

        <div className="h-32 bg-black flex items-center justify-around pb-4">
            {!capturedImage ? (
                <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:scale-105 transition-transform"
                >
                    <div className="w-14 h-14 rounded-full bg-white border-2 border-black"></div>
                </button>
            ) : (
                <div className="flex gap-6 w-full px-8">
                    <button 
                        onClick={retakePhoto}
                        className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} /> {t('upload.retake')}
                    </button>
                    <button 
                        onClick={confirmPhoto}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> {t('upload.use')}
                    </button>
                </div>
            )}
        </div>
      </div>
    );
  }

  // 3. Main Upload View
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-lg">{t('upload.title')}</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {!file ? (
          <>
            <div 
                onClick={startCamera}
                className="w-full aspect-[4/3] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center mb-4 cursor-pointer hover:bg-slate-100 transition-colors active:scale-95 group"
            >
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Camera size={32} />
              </div>
              <p className="font-bold text-slate-800 text-lg">{t('upload.scanWithCamera')}</p>
              <p className="text-sm text-slate-400 mt-1">{t('upload.scanDescription')}</p>
            </div>

            <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 px-2 text-slate-400">{t('upload.or')}</span>
                </div>
            </div>

            <label className="w-full mt-4 cursor-pointer">
                 <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-full py-4 rounded-xl border border-slate-200 text-slate-600 font-semibold flex items-center justify-center gap-2 hover:bg-white hover:shadow-sm transition-all">
                    <UploadIcon size={20} />
                    {t('upload.uploadFile')}
                  </div>
            </label>
            
            <div className="mt-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 w-full">
              <p className="font-bold mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> {t('upload.privacyTitle')}
              </p>
              {t('upload.privacyDescription')}
            </div>
          </>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <Button fullWidth onClick={handleStartAnalysis} className="mb-4">
              <ScanLine size={20} />
              {t('upload.startAnalysis')}
            </Button>
            <p className="text-xs text-center text-slate-400">
              {t('upload.termsAgreement')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};