/**
 * CameraView Component
 *
 * Full-screen camera view for capturing contract images.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, RefreshCw, Check } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  capturedImage: string | null;
  onClose: () => void;
  onCapture: () => void;
  onRetake: () => void;
  onConfirm: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  canvasRef,
  capturedImage,
  onClose,
  onCapture,
  onRetake,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex justify-between items-center p-4 text-white z-10">
        <button onClick={onClose} className="p-2 rounded-full bg-black/20 backdrop-blur-md">
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
            onClick={onCapture}
            className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:scale-105 transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-white border-2 border-black"></div>
          </button>
        ) : (
          <div className="flex gap-6 w-full px-8">
            <button
              onClick={onRetake}
              className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> {t('upload.retake')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Check size={18} /> {t('upload.use')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraView;
