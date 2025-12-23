import React, { useState, useRef, useEffect } from 'react';
import { Contract, ContractStatus } from '../types';
import { ChevronLeft, ChevronRight, MoreVertical, Calendar, CheckCircle2, Circle, AlertCircle, Share2, Download, ChevronDown, ChevronUp, Plus, X, FileText, StickyNote, Bell, List, PenTool, Sparkles, AlertTriangle, HelpCircle, Loader, Link2, Shield, Clock, ExternalLink, Award } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { contractsApi, analysisApi, blockchainApi, partiesApi, sharingApi, versionsApi, ApiError, BlockchainAnchor, Certificate, ContractParty, ShareLink, DocumentVersion } from '../services/api';
import { Users, Mail, UserPlus, Trash2, Send, Copy, Eye, Settings, History, Upload, RotateCcw } from 'lucide-react';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
  onViewDocument: () => void;
  onViewReport?: (analysis: any) => void;
  onStartSign?: () => void;
}

export const ContractDetail: React.FC<ContractDetailProps> = ({ contract, onBack, onViewDocument, onViewReport, onStartSign }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // API state management
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshContract, setFreshContract] = useState<Contract | null>(null);

  // Blockchain state management
  const [blockchainAnchors, setBlockchainAnchors] = useState<BlockchainAnchor[]>([]);
  const [isLoadingAnchors, setIsLoadingAnchors] = useState(false);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  // Parties state management
  const [parties, setParties] = useState<ContractParty[]>([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [newParty, setNewParty] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'party_b' as 'party_a' | 'party_b' | 'witness',
  });

  // Sharing state management
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);
  const [sharingError, setSharingError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCreatingShare, setIsCreatingShare] = useState(false);
  const [shareFormData, setShareFormData] = useState({
    expiresInHours: 168,
    allowDownload: true,
    password: '',
  });
  const [generatedShareLink, setGeneratedShareLink] = useState<ShareLink | null>(null);

  // Version history state management
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isReverting, setIsReverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use fresh contract data if available, otherwise use prop
  const displayContract = freshContract || contract;
  const [events, setEvents] = useState((contract as any).timeline || []);

  // Fetch contract details from backend
  useEffect(() => {
    const fetchContractDetails = async () => {
      // Only fetch if contract has an id and we don't already have fresh data
      if (!contract.id || freshContract) return;

      setIsLoading(true);
      setError(null);

      try {
        const fetchedContract = await contractsApi.get(contract.id);
        setFreshContract(fetchedContract as any);

        // Update events if fresh contract has timeline
        if ((fetchedContract as any).timeline) {
          setEvents((fetchedContract as any).timeline);
        }
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to fetch contract details';
        setError(errorMessage);
        console.error('Error fetching contract details:', err);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContractDetails();
  }, [contract.id]);

  // Fetch blockchain anchors
  useEffect(() => {
    const fetchAnchors = async () => {
      if (!contract.id) return;

      setIsLoadingAnchors(true);
      setAnchorError(null);

      try {
        const anchors = await blockchainApi.getContractAnchors(contract.id);
        setBlockchainAnchors(anchors);
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to fetch blockchain anchors';
        setAnchorError(errorMessage);
        console.error('Error fetching blockchain anchors:', err);
      } finally {
        setIsLoadingAnchors(false);
      }
    };

    fetchAnchors();
  }, [contract.id]);

  // Fetch parties
  useEffect(() => {
    const fetchParties = async () => {
      if (!contract.id) return;

      setIsLoadingParties(true);
      setPartiesError(null);

      try {
        const fetchedParties = await partiesApi.getContractParties(contract.id);
        setParties(fetchedParties);
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to fetch parties';
        setPartiesError(errorMessage);
        console.error('Error fetching parties:', err);
      } finally {
        setIsLoadingParties(false);
      }
    };

    fetchParties();
  }, [contract.id]);

  // Fetch share links
  useEffect(() => {
    const fetchShareLinks = async () => {
      if (!contract.id) return;

      setIsLoadingShares(true);
      setSharingError(null);

      try {
        const links = await sharingApi.getMyLinks(contract.id);
        setShareLinks(links);
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to fetch share links';
        setSharingError(errorMessage);
        console.error('Error fetching share links:', err);
      } finally {
        setIsLoadingShares(false);
      }
    };

    fetchShareLinks();
  }, [contract.id]);

  // Fetch version history
  useEffect(() => {
    const fetchVersions = async () => {
      if (!contract.id) return;

      setIsLoadingVersions(true);
      setVersionsError(null);

      try {
        const fetchedVersions = await versionsApi.getVersionHistory(contract.id);
        setVersions(fetchedVersions);
      } catch (err) {
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to fetch version history';
        setVersionsError(errorMessage);
        console.error('Error fetching versions:', err);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    fetchVersions();
  }, [contract.id]);

  // Helper for Local Date String (YYYY-MM-DD)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calendar View State
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(getLocalDateString(new Date()));
  
  const contentRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    const shareData = {
      title: displayContract.title,
      text: `${displayContract.title} ${t('contract.detail')}. ${t('contract.parties')}: ${(displayContract as any).partyName || 'N/A'}.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
      toast.success(t('report.copiedToClipboard'));
    }
  };

  const handleExportPDF = async () => {
    if (!contentRef.current || isExporting) return;
    
    setIsExporting(true);
    const originalScrollPos = window.scrollY;
    
    try {
      window.scrollTo(0, 0);
      // Wait for the analysis report to render
      await new Promise(resolve => setTimeout(resolve, 800));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvas = await html2canvas(contentRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC',
        windowHeight: contentRef.current.scrollHeight + 50 // Buffer for extra content
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

  const toggleEvent = (index: number) => {
    setExpandedEvent(expandedEvent === index ? null : index);
  };
  
  const getStatusLabel = (status: ContractStatus) => {
      switch (status) {
          case ContractStatus.Reviewing: return t('status.reviewing');
          case ContractStatus.Active: return t('status.active');
          case ContractStatus.Dispute: return t('status.dispute');
          case ContractStatus.Completed: return t('status.completed');
          default: return t('status.draft');
      }
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) return;
    setEvents([...events, { ...newEvent, completed: false }]);
    setNewEvent({ title: '', date: '' });
    setIsAddEventOpen(false);
  };

  const handleDocumentDownload = (docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t('contract.downloadingFile', { fileName: docName }));
  };

  const handleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(t('contract.sendNotificationConfirm'));
    if (confirmed) {
        toast.success(t('contract.notificationSent'));
    }
  };

  const handleAnchorToBlockchain = async () => {
    if (!contract.id) return;

    setIsAnchoring(true);
    setAnchorError(null);

    try {
      const documentHash = `hash_${contract.id}_${Date.now()}`;
      const anchor = await blockchainApi.anchor({
        contract_id: contract.id,
        document_hash: documentHash,
      });

      setBlockchainAnchors([...blockchainAnchors, anchor]);
      toast.success(t('blockchain.anchorSuccess'));
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to anchor to blockchain';
      setAnchorError(errorMessage);
      toast.error(errorMessage);
      console.error('Error anchoring to blockchain:', err);
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleDownloadCertificate = async (anchorId: string) => {
    try {
      const certificate = await blockchainApi.getCertificate(anchorId);

      if (certificate.pdf_url) {
        window.open(certificate.pdf_url, '_blank');
      } else {
        toast.info(t('blockchain.certificateGenerating'));
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to download certificate';
      toast.error(errorMessage);
      console.error('Error downloading certificate:', err);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://explorer.xphere.io/tx/${txHash}`;
  };

  const truncateHash = (hash: string, length: number = 8) => {
    if (!hash) return '';
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  // Sharing Handlers
  const handleCreateShareLink = async () => {
    if (!contract.id) return;

    setIsCreatingShare(true);
    setSharingError(null);

    try {
      const shareLink = await sharingApi.createShareLink({
        contract_id: contract.id,
        expires_in_hours: shareFormData.expiresInHours,
        allow_download: shareFormData.allowDownload,
        password: shareFormData.password || undefined,
      });

      setShareLinks([...shareLinks, shareLink]);
      setGeneratedShareLink(shareLink);
      toast.success(t('sharing.linkCreated'));
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to create share link';
      setSharingError(errorMessage);
      toast.error(errorMessage);
      console.error('Error creating share link:', err);
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(t('sharing.linkCopied'));
  };

  const handleRevokeShareLink = async (token: string) => {
    const confirmed = window.confirm(t('sharing.revokeConfirm'));
    if (!confirmed) return;

    try {
      await sharingApi.revokeShareLink(token);
      setShareLinks(shareLinks.filter(link => link.token !== token));
      toast.success(t('sharing.linkRevoked'));
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to revoke share link';
      toast.error(errorMessage);
      console.error('Error revoking share link:', err);
    }
  };

  const handleUpdateShareLink = async (token: string) => {
    try {
      const updatedLink = await sharingApi.updateShareLink(token, {
        expires_in_hours: shareFormData.expiresInHours,
        allow_download: shareFormData.allowDownload,
        password: shareFormData.password || undefined,
      });

      setShareLinks(shareLinks.map(link =>
        link.token === token ? updatedLink : link
      ));
      toast.success(t('sharing.linkUpdated'));
      setIsShareModalOpen(false);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to update share link';
      toast.error(errorMessage);
      console.error('Error updating share link:', err);
    }
  };

  // Version History Handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadVersion(file);
    }
  };

  const handleUploadVersion = async (file: File) => {
    if (!contract.id) return;

    setIsUploadingVersion(true);
    setVersionsError(null);

    try {
      const newVersion = await versionsApi.uploadVersion(contract.id, file);
      setVersions([newVersion, ...versions]);
      toast.success(t('versions.uploadSuccess'));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.uploadError');
      setVersionsError(errorMessage);
      toast.error(errorMessage);
      console.error('Error uploading version:', err);
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleRevertClick = (version: DocumentVersion) => {
    setSelectedVersion(version);
    setIsRevertModalOpen(true);
  };

  const handleRevertConfirm = async () => {
    if (!contract.id || !selectedVersion) return;

    setIsReverting(true);

    try {
      const result = await versionsApi.revertToVersion(contract.id, selectedVersion.version);
      setVersions([result.new_current_version, ...versions]);
      toast.success(t('versions.revertSuccess'));
      setIsRevertModalOpen(false);
      setSelectedVersion(null);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.revertError');
      toast.error(errorMessage);
      console.error('Error reverting version:', err);
    } finally {
      setIsReverting(false);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    try {
      await versionsApi.downloadVersion(versionId);
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : t('versions.downloadError');
      toast.error(errorMessage);
      console.error('Error downloading version:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Calendar Helpers
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newDate);
  };

  const goToToday = () => {
      const now = new Date();
      setCurrentMonth(now);
      setSelectedDate(getLocalDateString(now));
  };

  const getEventsForDate = (dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    
    const days = [];
    const todayStr = getLocalDateString(new Date());

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-10 w-full" />);
    }
    
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = getEventsForDate(dateStr);
        const hasEvents = dayEvents.length > 0;
        const isSelected = selectedDate === dateStr;
        const isToday = dateStr === todayStr;

        days.push(
            <button
                key={d}
                onClick={() => setSelectedDate(dateStr)}
                className={`h-10 w-full rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : isToday 
                        ? 'bg-blue-50 text-blue-600 font-bold' 
                        : 'hover:bg-slate-100 text-slate-700'
                }`}
            >
                <span className="relative z-10 text-sm">{d}</span>
                {hasEvents && (
                    <div className="flex gap-0.5 mt-0.5">
                       {dayEvents.slice(0, 3).map((e, i) => (
                           <span key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : e.completed ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                       ))}
                    </div>
                )}
            </button>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={20}/></button>
                <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{year}{t('common.year')} {month + 1}{t('common.month')}</span>
                    <button
                        onClick={goToToday}
                        className="text-[10px] px-2 py-1 bg-slate-100 rounded-full text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
                    >
                        {t('common.today')}
                    </button>
                </div>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {[t('common.sun'), t('common.mon'), t('common.tue'), t('common.wed'), t('common.thu'), t('common.fri'), t('common.sat')].map(day => (
                    <div key={day} className="text-center text-xs text-slate-400 font-medium py-1">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days}
            </div>
        </div>
    );
  };

  const displayEvents = viewMode === 'LIST' 
    ? events 
    : events.filter(e => e.date === selectedDate);

  // Loading state
  if (isLoading && !freshContract) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <div className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
            <ChevronLeft size={24} className="text-slate-600" />
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

  // Error state (non-blocking - show error but still render with prop data)
  const showErrorBanner = error && !freshContract;

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800 text-center truncate flex-1 px-2">
          {displayContract.title}
        </h2>
        <div className="flex items-center -mr-2 relative">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className={`p-2 rounded-full hover:bg-slate-50 text-slate-600 ${isExporting ? 'opacity-50' : ''}`}
            aria-label="Export PDF"
          >
            <Download size={22} />
          </button>
          <button 
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-slate-50 text-slate-600"
            aria-label="Share"
          >
            <Share2 size={22} />
          </button>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-slate-50 text-slate-600"
          >
            <MoreVertical size={22} />
          </button>
          
          {/* Dropdown Menu */}
          <AnimatePresence>
            {showMenu && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-12 right-0 bg-white rounded-xl shadow-xl border border-slate-100 w-48 z-50 overflow-hidden"
                >
                    <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => { setShowMenu(false); toast.info(t('contract.editInfo')); }}>
                        <FileEditIcon size={16} /> {t('contract.editInfo')}
                    </button>
                    <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50" onClick={() => { setShowMenu(false); toast.warning(t('contract.deleteContract')); }}>
                        <X size={16} /> {t('contract.deleteContract')}
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                  <p className="text-xs text-red-500 mt-2">{t('contract.showingCachedData') || 'Showing cached data. Some information may be outdated.'}</p>
                </div>
              </div>
            )}

            {/* Status Card */}
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{t('contract.status')}</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${(displayContract as any).status === ContractStatus.Active ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></span>
                    <span className="font-bold text-slate-800">{getStatusLabel((displayContract as any).status || ContractStatus.Draft)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{t('contract.counterparty')}</p>
                  <p className="font-medium text-slate-800">{(displayContract as any).partyName || 'N/A'}</p>
                </div>
              </div>

              {/* DocuSign Action Button - Visible only in Draft/Reviewing */}
              {((displayContract as any).status === ContractStatus.Draft || (displayContract as any).status === ContractStatus.Reviewing) && onStartSign && (
                  <button
                      onClick={onStartSign}
                      className="w-full mb-3 bg-[#1e2432] text-white py-3 rounded-lg font-bold text-sm shadow-md shadow-slate-300 hover:bg-[#2c3549] transition-all flex items-center justify-center gap-2"
                      data-html2canvas-ignore="true"
                  >
                      <PenTool size={16} className="text-[#ffc820]" />
                      <span>{t('contract.startDocuSign')}</span>
                  </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onViewDocument}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                  data-html2canvas-ignore="true"
                >
                  {t('contract.viewOriginal')}
                </button>
                <button
                  onClick={() => {
                      if (onViewReport && (displayContract as any).analysis) {
                          onViewReport((displayContract as any).analysis);
                      } else {
                          toast.warning(t('contract.noReportData'));
                      }
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
                  data-html2canvas-ignore="true"
                >
                  {(displayContract as any).analysis ? (
                      <>
                        <Sparkles size={14} className="text-blue-500" />
                        <span>{t('contract.aiReport')} ({(displayContract as any).analysis.score}{t('common.points')})</span>
                      </>
                  ) : (
                      t('contract.viewReport')
                  )}
                </button>
              </div>
            </Card>

            {/* Contract Content Preview Section */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-3 px-1">{t('contract.content')}</h3>
              <div
                onClick={onViewDocument}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                <div className="pl-2">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors"/>
                        <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600">{t('contract.originalPreview')}</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-serif">
                        {(displayContract as any).content || displayContract.description || t('contract.noContent')}
                    </p>
                    <div className="mt-3 flex items-center text-xs font-bold text-blue-600">
                        {t('contract.viewFullContent')} <ChevronRight size={14} />
                    </div>
                </div>
              </div>
              <div className="mt-3">
                  <Button fullWidth onClick={onViewDocument} variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                      <FileText size={16} /> {t('contract.viewFullOriginal')}
                  </Button>
              </div>
            </div>

            {/* Blockchain Proof Section */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-3 px-1 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                {t('blockchain.title')}
              </h3>

              <Card className="border-l-4 border-l-purple-500">
                {isLoadingAnchors ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="text-blue-600 animate-spin mr-3" />
                    <p className="text-sm text-slate-500">{t('blockchain.loadingAnchors')}</p>
                  </div>
                ) : anchorError && blockchainAnchors.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-800">{t('common.error')}</p>
                      <p className="text-xs text-red-600 mt-1">{anchorError}</p>
                    </div>
                  </div>
                ) : blockchainAnchors.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <Link2 size={24} className="text-purple-600" />
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">{t('blockchain.noAnchors')}</p>
                    <p className="text-xs text-slate-500 mb-4">{t('blockchain.noAnchorsDesc')}</p>
                    <button
                      onClick={handleAnchorToBlockchain}
                      disabled={isAnchoring}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      data-html2canvas-ignore="true"
                    >
                      {isAnchoring ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {t('blockchain.anchoring')}
                        </>
                      ) : (
                        <>
                          <Link2 size={16} />
                          {t('blockchain.anchorButton')}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Link2 size={16} className="text-purple-600" />
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          {t('blockchain.anchorsFound', { count: blockchainAnchors.length })}
                        </p>
                      </div>
                      <button
                        onClick={handleAnchorToBlockchain}
                        disabled={isAnchoring}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition disabled:opacity-50"
                        data-html2canvas-ignore="true"
                      >
                        {isAnchoring ? t('blockchain.anchoring') : t('blockchain.addAnchor')}
                      </button>
                    </div>

                    {blockchainAnchors.map((anchor) => (
                      <div
                        key={anchor.id}
                        className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-purple-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {anchor.status === 'confirmed' ? (
                              <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                            ) : anchor.status === 'failed' ? (
                              <X size={20} className="text-red-600 flex-shrink-0" />
                            ) : (
                              <Clock size={20} className="text-orange-500 flex-shrink-0 animate-pulse" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {anchor.status === 'confirmed'
                                  ? t('blockchain.statusConfirmed')
                                  : anchor.status === 'failed'
                                  ? t('blockchain.statusFailed')
                                  : t('blockchain.statusPending')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(anchor.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-xs font-bold">
                            <Shield size={12} />
                            {anchor.network}
                          </div>
                        </div>

                        {anchor.status === 'confirmed' && anchor.tx_hash && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                              <p className="text-xs text-slate-500 font-semibold">{t('blockchain.txHash')}:</p>
                              <a
                                href={getExplorerUrl(anchor.tx_hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 font-mono flex items-center gap-1"
                              >
                                {truncateHash(anchor.tx_hash)}
                                <ExternalLink size={12} />
                              </a>
                            </div>

                            {anchor.block_number && (
                              <div className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                <p className="text-xs text-slate-500 font-semibold">{t('blockchain.blockNumber')}:</p>
                                <p className="text-xs text-slate-800 font-mono">#{anchor.block_number}</p>
                              </div>
                            )}

                            <button
                              onClick={() => handleDownloadCertificate(anchor.id)}
                              className="w-full mt-2 bg-purple-600 text-white py-2 rounded-lg text-xs font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                              data-html2canvas-ignore="true"
                            >
                              <Award size={14} />
                              {t('blockchain.downloadCertificate')}
                            </button>
                          </div>
                        )}

                        {anchor.status === 'pending' && (
                          <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                            <p className="text-xs text-orange-700">
                              {t('blockchain.pendingDesc')}
                            </p>
                          </div>
                        )}

                        {anchor.status === 'failed' && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <p className="text-xs text-red-700">
                              {t('blockchain.failedDesc')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Version History Section */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-3 px-1 flex items-center gap-2">
                <History size={18} className="text-blue-600" />
                {t('versions.versionHistory')}
              </h3>

              <Card className="border-l-4 border-l-green-500">
                {isLoadingVersions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader size={24} className="text-blue-600 animate-spin mr-3" />
                    <p className="text-sm text-slate-500">{t('versions.loadingVersions')}</p>
                  </div>
                ) : versionsError && versions.length === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-800">{t('common.error')}</p>
                      <p className="text-xs text-red-600 mt-1">{versionsError}</p>
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
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingVersion}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                      data-html2canvas-ignore="true"
                    >
                      {isUploadingVersion ? (
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
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingVersion}
                        className="text-xs font-semibold text-green-600 hover:text-green-700 transition disabled:opacity-50 flex items-center gap-1"
                        data-html2canvas-ignore="true"
                      >
                        {isUploadingVersion ? (
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
                            onClick={() => handleDownloadVersion(version.id)}
                            className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                          >
                            <Download size={14} />
                            {t('versions.download')}
                          </button>
                          {!version.is_current && (
                            <button
                              onClick={() => handleRevertClick(version)}
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

            {/* Timeline (Core Lifecycle Feature) */}
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-lg text-slate-800">{t('contract.timeline')}</h3>
              <div className="flex gap-2 items-center">
                <div className="bg-slate-100 p-1 rounded-lg flex" data-html2canvas-ignore="true">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title={t('contract.listView')}
                    >
                        <List size={16}/>
                    </button>
                    <button
                        onClick={() => setViewMode('CALENDAR')}
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'CALENDAR' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title={t('contract.calendarView')}
                    >
                        <Calendar size={16}/>
                    </button>
                </div>
                <button 
                    onClick={() => setIsAddEventOpen(true)}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    data-html2canvas-ignore="true"
                >
                    <Plus size={18} />
                </button>
              </div>
            </div>
            
            {viewMode === 'CALENDAR' && renderCalendar()}
            
            <div className="relative pl-4 space-y-6 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {displayEvents.length > 0 ? (
                  displayEvents.map((event, idx) => {
                    const isExpanded = expandedEvent === idx;
                    const key = `${viewMode}-${idx}`;
                    
                    return (
                      <div 
                        key={key} 
                        onClick={() => toggleEvent(idx)}
                        className={`relative flex items-start gap-4 cursor-pointer group transition-all duration-200 ${isExpanded ? 'bg-white -mx-2 px-3 py-3 rounded-xl shadow-sm border border-slate-100 z-10' : ''}`}
                      >
                        <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 bg-white transition-colors ${event.completed ? 'border-blue-500 text-blue-500' : 'border-slate-300 text-slate-300 group-hover:border-slate-400'}`}>
                          {event.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </div>
                        <div className={`flex-1 pt-0.5 transition-opacity ${event.completed || isExpanded ? 'opacity-100' : 'opacity-70'}`}>
                          <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">{event.title}</p>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                                <Calendar size={12} />
                                <span>{event.date}</span>
                                </div>
                            </div>
                            <div className="text-slate-400" data-html2canvas-ignore="true">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                                    animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                                            {event.completed
                                                ? t('contract.eventCompletedDesc')
                                                : t('contract.eventInProgressDesc')}
                                        </p>

                                        {/* Event Notes */}
                                        {event.notes && (
                                            <div className="mb-3 bg-white p-2.5 rounded-lg border border-slate-100 flex gap-2">
                                                <StickyNote size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-slate-600">{event.notes}</p>
                                            </div>
                                        )}

                                        {/* Associated Documents */}
                                        {event.documents && event.documents.length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                    <FileText size={10} /> {t('contract.relatedDocuments')}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {event.documents.map((doc, i) => (
                                                        <div key={i} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 hover:border-blue-200 transition-colors cursor-pointer group/doc">
                                                            <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                                                                <FileText size={14} />
                                                            </div>
                                                            <span className="truncate flex-1 font-medium">{doc}</span>
                                                            <button
                                                                onClick={(e) => handleDocumentDownload(doc, e)}
                                                                className="text-blue-500 text-[10px] font-semibold opacity-0 group-hover/doc:opacity-100 transition-opacity"
                                                            >
                                                                {t('common.download')}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2" data-html2canvas-ignore="true">
                                            {event.completed ? (
                                                <button className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">
                                                    {t('contract.editDetails')}
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toast.success(t('contract.reminderSet')); }}
                                                        className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50"
                                                    >
                                                        <Bell size={12} className="inline mr-1" /> {t('contract.setReminder')}
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toast.success(t('contract.markedComplete')); }}
                                                        className="flex-1 bg-blue-600 text-white py-2 rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200"
                                                    >
                                                        {t('contract.markComplete')}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm bg-slate-100/50 rounded-lg border border-dashed border-slate-200">
                    {viewMode === 'CALENDAR' ? t('contract.noEventsOnDate') : t('contract.noEvents')}
                </div>
              )}
              
              {/* Dispute Prevention Nudge - Only show in List view to avoid clutter in day view */}
              {viewMode === 'LIST' && (
                  <div className="relative flex items-start gap-4">
                     <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center bg-orange-100 border-2 border-orange-200 text-orange-500 flex-shrink-0">
                       <AlertCircle size={14} />
                     </div>
                     <div className="flex-1 pt-0.5">
                       <p className="font-bold text-slate-800 text-sm">{t('contract.disputePreventionCheck')}</p>
                       <p className="text-xs text-slate-500 mt-1">
                         {t('contract.noResponseFromCounterparty')}
                       </p>
                       <button
                         onClick={handleReminder}
                         className="mt-2 text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                         data-html2canvas-ignore="true"
                       >
                         {t('contract.sendReminder')}
                       </button>
                     </div>
                  </div>
              )}
            </div>

            {/* AI Analysis Report (Visible Only During Export) */}
            {isExporting && (displayContract as any).analysis && (
                <div className="mt-8 pt-8 border-t-2 border-slate-200">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                        <Sparkles className="text-blue-600" size={24} />
                        {t('report.aiSafetyReport')}
                    </h3>

                    {/* Score */}
                    <div className="bg-slate-50 rounded-xl p-6 mb-6 flex items-center justify-between border border-slate-200">
                        <div>
                             <p className="text-sm text-slate-500 font-bold uppercase">{t('report.safetyScore')}</p>
                             <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-blue-600">{(displayContract as any).analysis.score}</span>
                                <span className="text-lg text-slate-400 mb-1">/ 100</span>
                             </div>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-semibold text-slate-700">{t('report.createdAt')}: {new Date().toLocaleDateString()}</p>
                             <p className="text-xs text-slate-400">SafeContract AI Analysis</p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                            <FileText size={20} className="text-slate-500" /> {t('report.summary')}
                        </h4>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed shadow-sm">
                            {(displayContract as any).analysis.summary}
                        </div>
                    </div>

                    {/* Risks */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                            <AlertTriangle size={20} className="text-orange-500" />
                            {t('report.detectedRisks')} ({(displayContract as any).analysis.risks?.length || 0})
                        </h4>
                        <div className="space-y-4">
                            {((displayContract as any).analysis.risks || []).map((risk: any, idx: number) => (
                                <div key={risk.id || idx} className="bg-white p-4 rounded-xl border-l-4 border-l-orange-500 border-y border-r border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-slate-900">{risk.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${risk.level === 'HIGH' ? 'bg-red-100 text-red-700' : risk.level === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{risk.level}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{risk.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                            <HelpCircle size={20} className="text-blue-500" />
                            {t('report.suggestedQuestions')}
                        </h4>
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                            <ul className="space-y-3">
                                {((displayContract as any).analysis.questions || []).map((q: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-700 items-start">
                                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-blue-500 text-xs font-bold shadow-sm flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        {q}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="text-center mt-12 pt-6 border-t border-slate-200">
                         <p className="text-xs text-slate-400">
                            {t('report.disclaimer')}
                        </p>
                        <p className="text-[10px] text-slate-300 mt-1">
                            Generated by SafeContract
                        </p>
                    </div>
                </div>
            )}
          </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddEventOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsAddEventOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-xl relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">{t('contract.addNewEvent')}</h3>
                <button onClick={() => setIsAddEventOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contract.eventName')}</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:bg-white outline-none transition-colors"
                    placeholder={t('contract.eventNamePlaceholder')}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">{t('contract.date')}</label>
                  <input
                    type="date"
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:bg-white outline-none transition-colors"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleAddEvent}
                    disabled={!newEvent.title || !newEvent.date}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    {t('common.add')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revert Version Confirmation Modal */}
      <AnimatePresence>
        {isRevertModalOpen && selectedVersion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsRevertModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative z-10"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <AlertCircle size={20} className="text-orange-600" />
                  {t('versions.revertConfirm')}
                </h3>
                <button onClick={() => setIsRevertModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-slate-700 mb-2">
                    {t('versions.revertWarning')}
                  </p>
                  <div className="bg-white rounded-lg p-3 mt-3">
                    <p className="text-xs text-slate-500 font-semibold mb-1">{t('versions.version')}</p>
                    <p className="text-sm font-bold text-slate-800">v{selectedVersion.version}</p>
                    <p className="text-xs text-slate-500 mt-2">{selectedVersion.file_name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatFileSize(selectedVersion.file_size)} - {new Date(selectedVersion.upload_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsRevertModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleRevertConfirm}
                    disabled={isReverting}
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {isReverting ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        {t('versions.reverting')}
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        {t('versions.revert')}
                      </>
                    )}
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

const FileEditIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);