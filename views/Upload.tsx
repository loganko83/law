import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Camera, Upload as UploadIcon, FileText, X, ChevronLeft, ScanLine, AlertTriangle, RefreshCw, Check, Settings, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContractAnalysis, UserProfile } from '../types';
import { analyzeContract } from '../services/contractAnalysis';
import { useToast } from '../components/Toast';
import { contractsApi, analysisApi, ApiError } from '../services/api';
import { extractPdfText, isPdfFile } from '../services/pdfExtractor';
import { extractImageText, isImageFile } from '../services/ocrService';
import { compressImage, shouldCompress, formatFileSize } from '../services/imageCompressor';

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
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<{ type: string; message: string } | null>(null);
  
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
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);

      let errorType = 'unknown';
      let errorMessage = t('upload.cameraError', 'Cannot access camera. Please check permissions.');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorType = 'permission';
        errorMessage = t('upload.cameraPermissionDenied', 'Camera access was denied.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorType = 'notFound';
        errorMessage = t('upload.cameraNotFound', 'No camera found on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorType = 'inUse';
        errorMessage = t('upload.cameraInUse', 'Camera is being used by another application.');
      } else if (err.name === 'OverconstrainedError') {
        errorType = 'constraints';
        errorMessage = t('upload.cameraConstraints', 'Camera does not support required settings.');
      } else if (err.name === 'SecurityError') {
        errorType = 'security';
        errorMessage = t('upload.cameraSecurityError', 'Camera access blocked for security reasons. Please use HTTPS.');
      }

      setCameraError({ type: errorType, message: errorMessage });
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
    setEstimatedTime(null);
    setAnalysisProgress(t('upload.processing'));

    try {
      // Step 1: Extract text from file (for fallback/local processing)
      setAnalysisProgress(t('upload.extractingText'));
      setEstimatedTime(t('upload.estimatedTime', { seconds: '5-10', defaultValue: 'About 5-10 seconds' }));
      let contractText = '';

      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        // Plain text file
        contractText = await file.text();
      } else if (isPdfFile(file)) {
        // PDF extraction using pdf.js
        setAnalysisProgress(t('upload.processingPdf', 'Processing PDF...'));
        setEstimatedTime(t('upload.estimatedTime', { seconds: '5-15', defaultValue: 'About 5-15 seconds' }));
        const pdfResult = await extractPdfText(file);
        if (pdfResult.success) {
          contractText = pdfResult.text;
        } else {
          // PDF might be scanned - try backend OCR
          console.warn('PDF text extraction failed, will rely on backend OCR:', pdfResult.error);
          contractText = ''; // Backend will handle OCR
        }
      } else if (isImageFile(file)) {
        // Image OCR using Tesseract.js
        setAnalysisProgress(t('upload.processingImage', 'Processing image with OCR...'));
        setEstimatedTime(t('upload.estimatedTime', { seconds: '15-30', defaultValue: 'About 15-30 seconds' }));
        const ocrResult = await extractImageText(file, (progress) => {
          setAnalysisProgress(`${t('upload.processingImage', 'Processing image...')} ${Math.round(progress.progress * 100)}%`);
        });
        if (ocrResult.success) {
          contractText = ocrResult.text;
          if (ocrResult.confidence < 70) {
            toast.warning(t('upload.lowOcrConfidence', 'OCR confidence is low. Please verify the extracted text.'));
          }
        } else {
          throw new Error(ocrResult.error || t('upload.ocrError', 'Failed to extract text from image.'));
        }
      } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // Word documents - rely on backend processing
        setAnalysisProgress(t('upload.processingDoc', 'Processing document...'));
        setEstimatedTime(t('upload.estimatedTime', { seconds: '5-10', defaultValue: 'About 5-10 seconds' }));
        contractText = ''; // Backend will handle extraction
      } else {
        // Try to read as text
        contractText = await file.text().catch(() => '');
      }

      if (!contractText || contractText.length < 50) {
        throw new Error(t('upload.extractionError', 'Could not extract sufficient text from the document. Please try a different file format.'));
      }

      // Step 2: Compress image if applicable
      let uploadFile = file;
      if (shouldCompress(file)) {
        setAnalysisProgress(t('upload.compressingImage', 'Compressing image...'));
        try {
          const compressionResult = await compressImage(file);
          if (compressionResult.compressionRatio > 1.2) {
            uploadFile = compressionResult.file;
            const savedSize = compressionResult.originalSize - compressionResult.compressedSize;
            toast.info(
              t('upload.compressionSuccess', {
                saved: formatFileSize(savedSize),
                ratio: compressionResult.compressionRatio.toFixed(1),
                defaultValue: `Image compressed - saved ${formatFileSize(savedSize)} (${compressionResult.compressionRatio.toFixed(1)}x smaller)`,
              })
            );
          }
        } catch (compressError) {
          console.warn('Image compression failed, using original:', compressError);
        }
      }

      // Step 3: Create contract via API
      setAnalysisProgress(t('upload.creatingContract', 'Creating contract...'));
      const contract = await contractsApi.create({
        title: file.name,
        description: `Contract uploaded from ${file.name}`,
        contract_type: 'other',
      });

      // Step 4: Upload document to contract
      setAnalysisProgress(t('upload.uploadingDocument', 'Uploading document...'));
      await contractsApi.uploadDocument(contract.id, uploadFile);

      // Step 5: Trigger analysis via API
      setAnalysisProgress(t('upload.aiAnalyzing'));
      setEstimatedTime(t('upload.estimatedTime', { seconds: '30-60', defaultValue: 'About 30-60 seconds' }));
      const analysisStart = await analysisApi.analyze(contract.id);

      // Step 6: Poll for analysis completion
      let analysisResult = await analysisApi.getAnalysis(analysisStart.analysis_id);
      let pollCount = 0;
      const maxPolls = 30;

      while (analysisResult.status !== 'completed' && analysisResult.status !== 'failed' && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        analysisResult = await analysisApi.getAnalysis(analysisStart.analysis_id);
        pollCount++;
      }

      if (analysisResult.status === 'failed') {
        throw new Error(t('upload.analysisError', 'Analysis failed. Please try again.'));
      }

      // Step 7: Convert API response to ContractAnalysis type
      const analysis: ContractAnalysis = {
        summary: analysisResult.summary || '',
        score: analysisResult.safety_score || 0,
        risks: (analysisResult.risks || []).map((risk, index) => ({
          id: `risk-${index}`,
          title: risk.type || '',
          description: risk.description || '',
          level: (risk.severity?.toUpperCase() || 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
        })),
        questions: analysisResult.questions || [],
      };

      // Step 8: Return results
      setAnalysisProgress(t('upload.complete'));
      onAnalyze(analysis, contractText);

    } catch (err) {
      console.error('Analysis failed:', err);

      // Determine appropriate error message
      let errorMessage = t('upload.analysisError', 'Analysis failed. Please try again.');

      if (err instanceof ApiError) {
        // Handle specific API errors
        if (err.status === 429) {
          errorMessage = t('errors.rateLimited', 'Too many requests. Please wait a moment and try again.');
        } else if (err.status === 413) {
          errorMessage = t('errors.fileTooLarge', 'File is too large. Maximum size is 10MB.');
        } else if (err.status === 400) {
          errorMessage = err.message || t('errors.invalidRequest', 'Invalid request. Please check the file format.');
        } else if (err.status === 401 || err.status === 403) {
          errorMessage = t('errors.authRequired', 'Please log in to analyze contracts.');
        } else if (err.status >= 500) {
          errorMessage = t('errors.serverError', 'Server error. Please try again later.');
        }
      } else if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
          // Network error - try fallback to local analysis
          try {
            setAnalysisProgress(t('upload.fallbackAnalysis', 'Using local analysis...'));
            let userContext = '';
            if (userProfile) {
              userContext = `User is a ${userProfile.businessType}.
              Business: ${userProfile.businessDescription}
              Known concerns: ${userProfile.legalConcerns}`;
            }

            // Re-extract text for local analysis
            let localContractText = '';
            if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
              localContractText = await file.text();
            } else if (isPdfFile(file)) {
              const pdfResult = await extractPdfText(file);
              localContractText = pdfResult.success ? pdfResult.text : '';
            } else if (isImageFile(file)) {
              const ocrResult = await extractImageText(file);
              localContractText = ocrResult.success ? ocrResult.text : '';
            }

            if (localContractText && localContractText.length >= 50) {
              const analysis = await analyzeContract(localContractText, userContext, false);
              setAnalysisProgress(t('upload.complete'));
              onAnalyze(analysis, localContractText);
              toast.info(t('upload.offlineMode', 'Analyzed using local processing (offline mode).'));
              return;
            }
          } catch (fallbackErr) {
            console.error('Fallback analysis failed:', fallbackErr);
          }
          errorMessage = t('errors.networkError', 'Network error. Please check your internet connection.');
        } else if (err.message.includes('OCR') || err.message.includes('extract')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
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
        {estimatedTime && (
          <p className="text-blue-400/70 text-sm text-center z-10 mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
            {estimatedTime}
          </p>
        )}

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
                    alt={t('upload.capturedContractImage', 'Captured contract document for analysis')}
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
                    accept="image/*,.pdf,.txt,text/plain,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    aria-label={t('upload.uploadFile')}
                  />
                  <div className="w-full py-4 rounded-xl border border-slate-200 text-slate-600 font-semibold flex flex-col items-center justify-center gap-1 hover:bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2">
                      <UploadIcon size={20} />
                      {t('upload.uploadFile')}
                    </div>
                    <span className="text-xs text-slate-400 font-normal">
                      {t('upload.maxFileSize', 'PDF, Images, TXT (Max 50MB)')}
                    </span>
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

      {/* Camera Error Modal */}
      <AnimatePresence>
        {cameraError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setCameraError(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative z-10"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="camera-error-title"
              aria-describedby="camera-error-desc"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <CameraOff size={32} className="text-red-500" />
                </div>
                <h3 id="camera-error-title" className="font-bold text-lg text-slate-800 mb-2">
                  {t('upload.cameraErrorTitle', 'Camera Access Issue')}
                </h3>
                <p id="camera-error-desc" className="text-sm text-slate-600 mb-4">
                  {cameraError.message}
                </p>

                {cameraError.type === 'permission' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-left w-full">
                    <p className="text-xs font-bold text-blue-800 mb-2">
                      {t('upload.cameraPermissionGuide', 'How to enable camera access:')}
                    </p>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                      <li>{t('upload.cameraStep1', 'Tap the lock icon in your browser address bar')}</li>
                      <li>{t('upload.cameraStep2', 'Find "Camera" in the permissions list')}</li>
                      <li>{t('upload.cameraStep3', 'Change the setting to "Allow"')}</li>
                      <li>{t('upload.cameraStep4', 'Refresh this page and try again')}</li>
                    </ol>
                  </div>
                )}

                {cameraError.type === 'inUse' && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 text-left w-full">
                    <p className="text-xs text-orange-700">
                      {t('upload.cameraInUseGuide', 'Please close other apps using the camera (video calls, camera app) and try again.')}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setCameraError(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-semibold text-sm hover:bg-slate-200 transition-colors"
                  >
                    {t('common.close', 'Close')}
                  </button>
                  <button
                    onClick={() => {
                      setCameraError(null);
                      startCamera();
                    }}
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    {t('upload.tryAgain', 'Try Again')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};