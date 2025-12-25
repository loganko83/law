/**
 * useUpload Hook
 *
 * Handles file upload, text extraction, and contract analysis.
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ContractAnalysis, UserProfile, RiskLevel } from '../../../types';
import { analyzeContract } from '../../../services/contractAnalysis';
import { useToast } from '../../../components/Toast';
import { contractsApi, analysisApi, ApiError } from '../../../services/api';
import { extractPdfText, isPdfFile } from '../../../services/pdfExtractor';
import { extractImageText, isImageFile } from '../../../services/ocrService';
import { compressImage, shouldCompress, formatFileSize } from '../../../services/imageCompressor';
import { UploadState } from '../types';

// Helper to safely convert severity string to RiskLevel enum
const mapSeverityToRiskLevel = (severity: string | undefined): RiskLevel => {
  const upper = severity?.toUpperCase() || '';
  if (upper === 'HIGH') return RiskLevel.High;
  if (upper === 'MEDIUM') return RiskLevel.Medium;
  return RiskLevel.Low;
};

interface UseUploadProps {
  onAnalyze: (analysis: ContractAnalysis, contractText: string) => void;
  userProfile?: UserProfile;
}

interface UseUploadReturn extends UploadState {
  setFile: (file: File | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStartAnalysis: () => Promise<void>;
  resetError: () => void;
  stopScanning: () => void;
}

export function useUpload({ onAnalyze, userProfile }: UseUploadProps): UseUploadReturn {
  const toast = useToast();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setError(null);
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!file) return;
    setIsScanning(true);
    setError(null);
    setEstimatedTime(null);
    setAnalysisProgress(t('upload.processing'));

    try {
      // Step 1: Extract text from file
      setAnalysisProgress(t('upload.extractingText'));
      setEstimatedTime(t('upload.estimatedTime', { seconds: '5-10', defaultValue: 'About 5-10 seconds' }));
      let contractText = '';

      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        contractText = await file.text();
      } else if (isPdfFile(file)) {
        setAnalysisProgress(t('upload.processingPdf', 'Processing PDF...'));
        setEstimatedTime(t('upload.estimatedTime', { seconds: '5-15', defaultValue: 'About 5-15 seconds' }));
        const pdfResult = await extractPdfText(file);
        if (pdfResult.success) {
          contractText = pdfResult.text;
        } else {
          console.warn('PDF text extraction failed, will rely on backend OCR:', pdfResult.error);
          contractText = '';
        }
      } else if (isImageFile(file)) {
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
        setAnalysisProgress(t('upload.processingDoc', 'Processing document...'));
        setEstimatedTime(t('upload.estimatedTime', { seconds: '5-10', defaultValue: 'About 5-10 seconds' }));
        contractText = '';
      } else {
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
          level: mapSeverityToRiskLevel(risk.severity),
        })),
        questions: analysisResult.questions || [],
      };

      // Step 8: Return results
      setAnalysisProgress(t('upload.complete'));
      onAnalyze(analysis, contractText);

    } catch (err) {
      console.error('Analysis failed:', err);

      let errorMessage = t('upload.analysisError', 'Analysis failed. Please try again.');

      if (err instanceof ApiError) {
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
  }, [file, t, toast, onAnalyze, userProfile]);

  return {
    file,
    isScanning,
    analysisProgress,
    error,
    estimatedTime,
    setFile,
    handleFileChange,
    handleStartAnalysis,
    resetError,
    stopScanning,
  };
}
