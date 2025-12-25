/**
 * UploadForm Component
 *
 * Main upload form with camera scan and file upload options.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Camera, Upload as UploadIcon, FileText, X, ChevronLeft, ScanLine, AlertTriangle } from 'lucide-react';

interface UploadFormProps {
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onStartCamera: () => void;
  onStartAnalysis: () => void;
  onCancel: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  file,
  onFileChange,
  onClearFile,
  onStartCamera,
  onStartAnalysis,
  onCancel,
}) => {
  const { t } = useTranslation();

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
              onClick={onStartCamera}
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
                onChange={onFileChange}
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
              <button onClick={onClearFile} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <Button fullWidth onClick={onStartAnalysis} className="mb-4">
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

export default UploadForm;
