import React, { useState, useRef } from 'react';
import { Contract, ContractStatus } from '../types';
import { ChevronLeft, ChevronRight, MoreVertical, Calendar, CheckCircle2, Circle, AlertCircle, Share2, Download, ChevronDown, ChevronUp, Plus, X, FileText, StickyNote, Bell, List, PenTool, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
  onViewDocument: () => void;
  onViewReport?: (analysis: any) => void;
  onStartSign?: () => void; // New prop
}

export const ContractDetail: React.FC<ContractDetailProps> = ({ contract, onBack, onViewDocument, onViewReport, onStartSign }) => {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [events, setEvents] = useState(contract.timeline || []);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
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
      title: contract.title,
      text: `${contract.title} 계약 검토 중. 상대방: ${contract.partyName}.`,
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
      alert('계약 정보가 클립보드에 복사되었습니다.');
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
        title: contract.title,
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

      const cleanTitle = contract.title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      pdf.save(`${cleanTitle}_report.pdf`);
    } catch (e) {
        console.error(e);
        alert('PDF 생성 중 오류가 발생했습니다.');
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
          case ContractStatus.Reviewing: return '검토중';
          case ContractStatus.Active: return '진행중';
          case ContractStatus.Dispute: return '분쟁';
          case ContractStatus.Completed: return '완료';
          default: return '작성중';
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
    alert(`'${docName}' 파일을 다운로드합니다.`);
  };

  const handleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('상대방에게 계약 관련 알림(문자/이메일)을 전송하시겠습니까?');
    if (confirmed) {
        alert('알림이 전송되었습니다.');
    }
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
                    <span className="font-bold text-slate-800">{year}년 {month + 1}월</span>
                    <button 
                        onClick={goToToday}
                        className="text-[10px] px-2 py-1 bg-slate-100 rounded-full text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
                    >
                        오늘
                    </button>
                </div>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
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

  return (
    <div className="bg-slate-50 min-h-screen pb-10">
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800 text-center truncate flex-1 px-2">
          {contract.title}
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
                    <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2" onClick={() => { setShowMenu(false); alert('계약 정보 수정'); }}>
                        <FileEditIcon size={16} /> 정보 수정
                    </button>
                    <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50" onClick={() => { setShowMenu(false); alert('계약 삭제'); }}>
                        <X size={16} /> 계약 삭제
                    </button>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Ref for Printing */}
      <div ref={contentRef} className="bg-slate-50">
          <div className="p-6">
            {/* Status Card */}
            <Card className="mb-6 border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">계약 상태</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${contract.status === ContractStatus.Active ? 'bg-green-500' : 'bg-blue-500'} animate-pulse`}></span>
                    <span className="font-bold text-slate-800">{getStatusLabel(contract.status)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">계약 상대방</p>
                  <p className="font-medium text-slate-800">{contract.partyName}</p>
                </div>
              </div>
              
              {/* DocuSign Action Button - Visible only in Draft/Reviewing */}
              {(contract.status === ContractStatus.Draft || contract.status === ContractStatus.Reviewing) && onStartSign && (
                  <button 
                      onClick={onStartSign}
                      className="w-full mb-3 bg-[#1e2432] text-white py-3 rounded-lg font-bold text-sm shadow-md shadow-slate-300 hover:bg-[#2c3549] transition-all flex items-center justify-center gap-2"
                      data-html2canvas-ignore="true"
                  >
                      <PenTool size={16} className="text-[#ffc820]" /> 
                      <span>DocuSign으로 전자서명 시작</span>
                  </button>
              )}

              <div className="flex gap-2">
                <button 
                  onClick={onViewDocument}
                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition"
                  data-html2canvas-ignore="true" 
                >
                  원문 보기
                </button>
                <button 
                  onClick={() => {
                      if (onViewReport && contract.analysis) {
                          onViewReport(contract.analysis);
                      } else {
                          alert('리포트 데이터가 없습니다.');
                      }
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center justify-center gap-1.5"
                  data-html2canvas-ignore="true"
                >
                  {contract.analysis ? (
                      <>
                        <Sparkles size={14} className="text-blue-500" />
                        <span>AI 리포트 ({contract.analysis.score}점)</span>
                      </>
                  ) : (
                      '리포트 보기'
                  )}
                </button>
              </div>
            </Card>

            {/* Contract Content Preview Section */}
            <div className="mb-6">
              <h3 className="font-bold text-lg text-slate-800 mb-3 px-1">계약서 내용</h3>
              <div 
                onClick={onViewDocument}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 transition-colors group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                <div className="pl-2">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors"/>
                        <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600">계약서 원문 미리보기</span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed font-serif">
                        {contract.content || "계약서 내용이 없습니다."}
                    </p>
                    <div className="mt-3 flex items-center text-xs font-bold text-blue-600">
                        전체 내용 확인하기 <ChevronRight size={14} />
                    </div>
                </div>
              </div>
              <div className="mt-3">
                  <Button fullWidth onClick={onViewDocument} variant="outline" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                      <FileText size={16} /> 계약서 전체 원문 보기
                  </Button>
              </div>
            </div>

            {/* Timeline (Core Lifecycle Feature) */}
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="font-bold text-lg text-slate-800">계약 타임라인</h3>
              <div className="flex gap-2 items-center">
                <div className="bg-slate-100 p-1 rounded-lg flex" data-html2canvas-ignore="true">
                    <button 
                        onClick={() => setViewMode('LIST')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title="리스트 보기"
                    >
                        <List size={16}/>
                    </button>
                    <button 
                        onClick={() => setViewMode('CALENDAR')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'CALENDAR' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                        title="달력 보기"
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
                                                ? "완료된 단계입니다. 관련 문서가 모두 확인되었습니다."
                                                : "진행 중인 단계입니다. 기한 내에 조건이 충족되었는지 확인하세요."}
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
                                                    <FileText size={10} /> 관련 문서
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
                                                                다운로드
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-2" data-html2canvas-ignore="true">
                                            {event.completed ? (
                                                <button className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">
                                                    상세 내역 수정
                                                </button>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); alert('알림이 설정되었습니다.'); }}
                                                        className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50"
                                                    >
                                                        <Bell size={12} className="inline mr-1" /> 알림 설정
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); alert('완료 처리되었습니다.'); }}
                                                        className="flex-1 bg-blue-600 text-white py-2 rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200"
                                                    >
                                                        완료 표시
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
                    {viewMode === 'CALENDAR' ? '선택한 날짜에 일정이 없습니다.' : '일정이 없습니다.'}
                </div>
              )}
              
              {/* Dispute Prevention Nudge - Only show in List view to avoid clutter in day view */}
              {viewMode === 'LIST' && (
                  <div className="relative flex items-start gap-4">
                     <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center bg-orange-100 border-2 border-orange-200 text-orange-500 flex-shrink-0">
                       <AlertCircle size={14} />
                     </div>
                     <div className="flex-1 pt-0.5">
                       <p className="font-bold text-slate-800 text-sm">분쟁 예방 체크</p>
                       <p className="text-xs text-slate-500 mt-1">
                         상대방이 응답하지 않나요?
                       </p>
                       <button 
                         onClick={handleReminder}
                         className="mt-2 text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                         data-html2canvas-ignore="true"
                       >
                         리마인더 보내기
                       </button>
                     </div>
                  </div>
              )}
            </div>

            {/* AI Analysis Report (Visible Only During Export) */}
            {isExporting && contract.analysis && (
                <div className="mt-8 pt-8 border-t-2 border-slate-200">
                    <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2">
                        <Sparkles className="text-blue-600" size={24} />
                        AI 안전 진단 리포트
                    </h3>
                    
                    {/* Score */}
                    <div className="bg-slate-50 rounded-xl p-6 mb-6 flex items-center justify-between border border-slate-200">
                        <div>
                             <p className="text-sm text-slate-500 font-bold uppercase">계약 안전 점수</p>
                             <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-blue-600">{contract.analysis.score}</span>
                                <span className="text-lg text-slate-400 mb-1">/ 100</span>
                             </div>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-semibold text-slate-700">작성일: {new Date().toLocaleDateString()}</p>
                             <p className="text-xs text-slate-400">SafeContract AI Analysis</p>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                            <FileText size={20} className="text-slate-500" /> 요약
                        </h4>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed shadow-sm">
                            {contract.analysis.summary}
                        </div>
                    </div>

                    {/* Risks */}
                    <div className="mb-8">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                            <AlertTriangle size={20} className="text-orange-500" /> 
                            감지된 위험 요소 ({contract.analysis.risks.length})
                        </h4>
                        <div className="space-y-4">
                            {contract.analysis.risks.map(risk => (
                                <div key={risk.id} className="bg-white p-4 rounded-xl border-l-4 border-l-orange-500 border-y border-r border-slate-200 shadow-sm">
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
                            추천 질문 (특약 검토)
                        </h4>
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                            <ul className="space-y-3">
                                {contract.analysis.questions.map((q, i) => (
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
                            본 리포트는 AI 분석 결과이며 법적 효력이 없습니다. 중요한 계약은 법률 전문가와 상담하세요.
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
                <h3 className="font-bold text-lg text-slate-800">새 일정 추가</h3>
                <button onClick={() => setIsAddEventOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">일정 이름</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:bg-white outline-none transition-colors"
                    placeholder="예: 중도금 지급"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">날짜</label>
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
                    추가하기
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