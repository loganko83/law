/**
 * Upload View Types
 */
import { ContractAnalysis, UserProfile } from '../../types';

export interface UploadProps {
  onAnalyze: (analysis: ContractAnalysis, contractText: string) => void;
  onCancel: () => void;
  userProfile?: UserProfile;
}

export interface CameraError {
  type: string;
  message: string;
}

export interface UploadState {
  file: File | null;
  isScanning: boolean;
  analysisProgress: string;
  error: string | null;
  estimatedTime: string | null;
}

export interface CameraState {
  isCameraOpen: boolean;
  cameraStream: MediaStream | null;
  capturedImage: string | null;
  cameraError: CameraError | null;
}
