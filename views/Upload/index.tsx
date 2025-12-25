/**
 * Upload View
 *
 * Main container component that orchestrates the upload flow.
 * Uses modular sub-components and custom hooks for separation of concerns.
 */
import React from 'react';
import { useToast } from '../../components/Toast';
import { useTranslation } from 'react-i18next';
import { UploadProps } from './types';
import { useUpload } from './hooks/useUpload';
import { useCamera } from './hooks/useCamera';
import { ScanningView } from './ScanningView';
import { CameraView } from './CameraView';
import { UploadForm } from './UploadForm';
import { CameraErrorModal } from './CameraErrorModal';

export const Upload: React.FC<UploadProps> = ({ onAnalyze, onCancel, userProfile }) => {
  const toast = useToast();
  const { t } = useTranslation();

  // Upload state and handlers
  const {
    file,
    isScanning,
    analysisProgress,
    error,
    estimatedTime,
    setFile,
    handleFileChange,
    handleStartAnalysis,
    stopScanning,
  } = useUpload({ onAnalyze, userProfile });

  // Camera state and handlers
  const {
    isCameraOpen,
    capturedImage,
    cameraError,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    capturePhoto,
    retakePhoto,
    confirmPhoto,
    clearCameraError,
  } = useCamera();

  // Handle confirmed photo from camera
  const handleConfirmPhoto = async () => {
    const capturedFile = await confirmPhoto();
    if (capturedFile) {
      setFile(capturedFile);
    } else {
      toast.error(t('upload.imageConversionError', 'Failed to process the captured image. Please try again.'));
    }
  };

  // Handle camera retry (clear error and restart)
  const handleCameraRetry = () => {
    clearCameraError();
    startCamera();
  };

  // 1. Scanning Animation View
  if (isScanning) {
    return (
      <ScanningView
        analysisProgress={analysisProgress}
        estimatedTime={estimatedTime}
        error={error}
        onRetry={stopScanning}
      />
    );
  }

  // 2. Camera View
  if (isCameraOpen) {
    return (
      <CameraView
        videoRef={videoRef}
        canvasRef={canvasRef}
        capturedImage={capturedImage}
        onClose={stopCamera}
        onCapture={capturePhoto}
        onRetake={retakePhoto}
        onConfirm={handleConfirmPhoto}
      />
    );
  }

  // 3. Main Upload View
  return (
    <>
      <UploadForm
        file={file}
        onFileChange={handleFileChange}
        onClearFile={() => setFile(null)}
        onStartCamera={startCamera}
        onStartAnalysis={handleStartAnalysis}
        onCancel={onCancel}
      />

      {/* Camera Error Modal */}
      <CameraErrorModal
        cameraError={cameraError}
        onClose={clearCameraError}
        onRetry={handleCameraRetry}
      />
    </>
  );
};

export default Upload;
