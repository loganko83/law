/**
 * VersionsSection Component
 * Displays version history with upload/download/revert functionality
 */

import React from 'react';
import {
  History,
  Loader,
  AlertCircle,
  FileText,
  Upload,
  Download,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { DocumentVersion } from '../../services/api';

interface VersionsSectionProps {
  versions: DocumentVersion[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (versionId: string) => void;
  onRevertClick: (version: DocumentVersion) => void;
  formatFileSize: (bytes: number) => string;
}

export const VersionsSection: React.FC<VersionsSectionProps> = ({
  versions,
  isLoading,
  isUploading,
  error,
  fileInputRef,
  onFileSelect,
  onDownload,
  onRevertClick,
  formatFileSize,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-6">
      <h3 className="font-bold text-lg text-slate-800 mb-3 px-1 flex items-center gap-2">
        <History size={18} className="text-blue-600" />
        {t('versions.versionHistory')}
      </h3>

      <Card className="border-l-4 border-l-green-500">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="text-blue-600 animate-spin mr-3" />
            <p className="text-sm text-slate-500">{t('versions.loadingVersions')}</p>
          </div>
        ) : error && versions.length === 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-800">{t('common.error')}</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <History size={24} className="text-green-600" />
              </div>
            </div>
            <p className="text-sm font-bold text-slate-800 mb-1">{t('versions.noVersions')}</p>
            <p className="text-xs text-slate-500 mb-4">{t('versions.noVersionsDesc')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={onFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              data-html2canvas-ignore="true"
            >
              {isUploading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {t('versions.uploading')}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {t('versions.uploadNewVersion')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-green-600" />
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  {versions.length} {versions.length === 1 ? t('versions.version') : t('versions.versionHistory')}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={onFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs font-semibold text-green-600 hover:text-green-700 transition disabled:opacity-50 flex items-center gap-1"
                data-html2canvas-ignore="true"
              >
                {isUploading ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    {t('versions.uploading')}
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    {t('versions.uploadNewVersion')}
                  </>
                )}
              </button>
            </div>

            {versions.map((version) => (
              <div
                key={version.id}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={20} className="text-green-600 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">
                          v{version.version}
                        </p>
                        {version.is_current && (
                          <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {t('versions.currentVersion')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {version.file_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold">{t('versions.fileSize')}:</p>
                    <p className="text-xs text-slate-800 font-mono">{formatFileSize(version.file_size)}</p>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold">{t('versions.uploadDate')}:</p>
                    <p className="text-xs text-slate-800">{new Date(version.upload_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2" data-html2canvas-ignore="true">
                  <button
                    onClick={() => onDownload(version.id)}
                    className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    {t('versions.download')}
                  </button>
                  {!version.is_current && (
                    <button
                      onClick={() => onRevertClick(version)}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} />
                      {t('versions.revert')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
