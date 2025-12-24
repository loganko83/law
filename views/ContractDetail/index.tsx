/**
 * ContractDetail Component
 * Main container that orchestrates all contract detail subcomponents
 */

import React, { useState, useRef } from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';
import { Contract } from '../../types';

// Hooks
import { useContractData, useBlockchain, useVersions, useTimeline } from './hooks';

// Components
import { ContractHeader } from './ContractHeader';
import { StatusCard } from './StatusCard';
import { ContentPreview } from './ContentPreview';
import { BlockchainSection } from './BlockchainSection';
import { VersionsSection } from './VersionsSection';
import { TimelineSection } from './TimelineSection';
import { AddEventModal } from './AddEventModal';
import { RevertVersionModal } from './RevertVersionModal';
import { ExportReportSection } from './ExportReportSection';

// Types
import { ContractDetailProps } from './types';

export const ContractDetail: React.FC<ContractDetailProps> = ({
  contract,
  onBack,
  onViewDocument,
  onViewReport,
  onStartSign,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all contract data
  const {
    freshContract,
    events,
    setEvents,
    isLoading,
    error,
    blockchainAnchors,
    setBlockchainAnchors,
    isLoadingAnchors,
    anchorError,
    versions,
    setVersions,
    isLoadingVersions,
    versionsError,
  } = useContractData(contract);

  // Display contract (prefer fresh data)
  const displayContract = freshContract || contract;

  // Blockchain hooks
  const {
    isAnchoring,
    handleAnchorToBlockchain,
    handleDownloadCertificate,
    getExplorerUrl,
    truncateHash,
  } = useBlockchain(contract.id, blockchainAnchors, setBlockchainAnchors);

  // Versions hooks
  const {
    isUploading,
    isReverting,
    isRevertModalOpen,
    selectedVersion,
    fileInputRef,
    handleFileSelect,
    handleRevertClick,
    handleRevertConfirm,
    handleDownloadVersion,
    closeRevertModal,
    formatFileSize,
  } = useVersions(contract.id, versions, setVersions);

  // Timeline hooks
  const {
    viewMode,
    setViewMode,
    currentMonth,
    selectedDate,
    expandedEvent,
    isAddEventOpen,
    newEvent,
    changeMonth,
    goToToday,
    setSelectedDate,
    toggleEvent,
    setIsAddEventOpen,
    setNewEvent,
    handleAddEvent,
    getEventsForDate,
    getLocalDateString,
    displayEvents,
  } = useTimeline(events, setEvents);

  // PDF Export handler
  const handleExportPDF = async () => {
    if (!contentRef.current || isExporting) return;

    setIsExporting(true);
    const originalScrollPos = window.scrollY;

    try {
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Lazy load PDF libraries
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC',
        windowHeight: contentRef.current.scrollHeight + 50
      });

      const imgData = canvas.toDataURL('image/png');
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.setProperties({
        title: displayContract.title,
        subject: 'Contract Analysis Report',
        author: 'SafeContract',
        creator: 'SafeContract AI Service'
      });

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const cleanTitle = displayContract.title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      pdf.save(`${cleanTitle}_report.pdf`);
    } catch (e) {
      console.error(e);
      toast.error(t('common.error'));
    } finally {
      window.scrollTo(0, originalScrollPos);
      setIsExporting(false);
    }
  };

  // Loading state
  if (isLoading && !freshContract) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
            <span className="sr-only">{t('common.back')}</span>
          </button>
          <h2 className="font-bold text-slate-800 text-center truncate flex-1 px-2">
            {contract.title}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader size={40} className="text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">{t('common.loading') || 'Loading contract details...'}</p>
        </div>
      </div>
    );
  }

  const showErrorBanner = error && !freshContract;

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* Header */}
      <ContractHeader
        contract={displayContract}
        onBack={onBack}
        onExportPDF={handleExportPDF}
        isExporting={isExporting}
      />

      {/* Main Content Ref for Printing */}
      <div ref={contentRef} className="bg-slate-50">
        <div className="p-6">
          {/* Error Banner */}
          {showErrorBanner && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800">{t('common.error') || 'Error'}</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <p className="text-xs text-red-500 mt-2">
                  {t('contract.showingCachedData') || 'Showing cached data. Some information may be outdated.'}
                </p>
              </div>
            </div>
          )}

          {/* Status Card */}
          <StatusCard
            contract={displayContract}
            onViewDocument={onViewDocument}
            onViewReport={onViewReport}
            onStartSign={onStartSign}
          />

          {/* Content Preview */}
          <ContentPreview
            contract={displayContract}
            onViewDocument={onViewDocument}
          />

          {/* Blockchain Section */}
          <BlockchainSection
            anchors={blockchainAnchors}
            isLoading={isLoadingAnchors}
            isAnchoring={isAnchoring}
            error={anchorError}
            onAnchor={handleAnchorToBlockchain}
            onDownloadCertificate={handleDownloadCertificate}
            getExplorerUrl={getExplorerUrl}
            truncateHash={truncateHash}
          />

          {/* Version History Section */}
          <VersionsSection
            versions={versions}
            isLoading={isLoadingVersions}
            isUploading={isUploading}
            error={versionsError}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onDownload={handleDownloadVersion}
            onRevertClick={handleRevertClick}
            formatFileSize={formatFileSize}
          />

          {/* Timeline Section */}
          <TimelineSection
            events={events}
            displayEvents={displayEvents}
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            expandedEvent={expandedEvent}
            onChangeMonth={changeMonth}
            onGoToToday={goToToday}
            onSelectDate={setSelectedDate}
            onToggleEvent={toggleEvent}
            onAddEvent={() => setIsAddEventOpen(true)}
            getEventsForDate={getEventsForDate}
            getLocalDateString={getLocalDateString}
          />

          {/* AI Analysis Report (Visible Only During Export) */}
          <ExportReportSection
            analysis={(displayContract as any).analysis}
            isExporting={isExporting}
          />
        </div>
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
        onAddEvent={handleAddEvent}
      />

      {/* Revert Version Modal */}
      <RevertVersionModal
        isOpen={isRevertModalOpen}
        onClose={closeRevertModal}
        selectedVersion={selectedVersion}
        isReverting={isReverting}
        onConfirm={handleRevertConfirm}
        formatFileSize={formatFileSize}
      />
    </div>
  );
};

export default ContractDetail;
