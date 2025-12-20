import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../components/Button';
import { Camera, Upload as UploadIcon, FileText, X, ChevronLeft, ScanLine, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadProps {
  onAnalyze: () => void;
  onCancel: () => void;
}

export const Upload: React.FC<UploadProps> = ({ onAnalyze, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
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
      alert("카메라에 접근할 수 없습니다. 권한을 확인해주세요.");
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

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert DataURL to File
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "scanned-contract.jpg", { type: "image/jpeg" });
          setFile(file);
          setCapturedImage(null);
          setCameraStream(null);
          setIsCameraOpen(false);
        });
    }
  };

  const handleStartAnalysis = () => {
    if (!file) return;
    setIsScanning(true);
    // Simulate API delay
    setTimeout(() => {
      onAnalyze();
    }, 2500);
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
             <p className="text-xs text-blue-300 font-mono">OCR 처리 중...</p>
           </div>
        </div>

        <h2 className="text-2xl font-bold mb-2 z-10">계약서 분석 중</h2>
        <p className="text-slate-400 text-center z-10 max-w-xs">
          AI가 주요 위험 요소와 독소 조항을 검토하고 있습니다.
        </p>
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
            <span className="font-semibold">계약서 스캔</span>
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
                        <RefreshCw size={18} /> 재촬영
                    </button>
                    <button 
                        onClick={confirmPhoto}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> 사용하기
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
        <h2 className="font-bold text-lg">계약서 진단</h2>
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
              <p className="font-bold text-slate-800 text-lg">카메라로 스캔</p>
              <p className="text-sm text-slate-400 mt-1">계약서 사진을 찍어주세요</p>
            </div>

            <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 px-2 text-slate-400">또는</span>
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
                    PDF 또는 이미지 업로드
                  </div>
            </label>
            
            <div className="mt-8 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800 w-full">
              <p className="font-bold mb-1 flex items-center gap-2">
                <AlertTriangle size={16} /> 개인정보 보호
              </p>
              업로드된 계약서는 안전하게 처리되며 분석 후 즉시 삭제됩니다.
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
              분석 시작하기
            </Button>
            <p className="text-xs text-center text-slate-400">
              분석을 시작하면 서비스 이용 약관에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};