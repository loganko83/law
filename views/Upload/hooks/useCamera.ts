/**
 * useCamera Hook
 *
 * Handles camera access, photo capture, and error management.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CameraState, CameraError } from '../types';

interface UseCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => void;
  retakePhoto: () => Promise<void>;
  confirmPhoto: () => Promise<File | null>;
  clearCameraError: () => void;
}

export function useCamera(): UseCameraReturn {
  const { t } = useTranslation();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Attach stream to video element when camera opens
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: unknown) {
      console.error("Error accessing camera:", err);

      let errorType = 'unknown';
      let errorMessage = t('upload.cameraError', 'Cannot access camera. Please check permissions.');

      const errorName = err instanceof Error ? err.name : '';

      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        errorType = 'permission';
        errorMessage = t('upload.cameraPermissionDenied', 'Camera access was denied.');
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        errorType = 'notFound';
        errorMessage = t('upload.cameraNotFound', 'No camera found on this device.');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        errorType = 'inUse';
        errorMessage = t('upload.cameraInUse', 'Camera is being used by another application.');
      } else if (errorName === 'OverconstrainedError') {
        errorType = 'constraints';
        errorMessage = t('upload.cameraConstraints', 'Camera does not support required settings.');
      } else if (errorName === 'SecurityError') {
        errorType = 'security';
        errorMessage = t('upload.cameraSecurityError', 'Camera access blocked for security reasons. Please use HTTPS.');
      }

      setCameraError({ type: errorType, message: errorMessage });
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  }, [cameraStream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

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
  }, [cameraStream]);

  const retakePhoto = useCallback(async () => {
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
    } catch (err) {
      console.error("Error restarting camera:", err);
    }
  }, []);

  const confirmPhoto = useCallback(async (): Promise<File | null> => {
    if (capturedImage) {
      try {
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const file = new File([blob], "scanned-contract.jpg", { type: "image/jpeg" });
        setCapturedImage(null);
        setCameraStream(null);
        setIsCameraOpen(false);
        return file;
      } catch (err) {
        console.error("Error converting captured image:", err);
        return null;
      }
    }
    return null;
  }, [capturedImage]);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
  }, []);

  return {
    isCameraOpen,
    cameraStream,
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
  };
}
