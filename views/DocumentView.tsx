import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Contract, RiskLevel, ContractAnalysis, UserProfile } from '../types';
import { ChevronLeft, AlertTriangle, X, Search, List, ArrowUp, ArrowDown, Copy, Check, HelpCircle, Sparkles, RefreshCw, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

interface DocumentViewProps {
  contract: Contract;
  userProfile?: UserProfile;
  onBack: () => void;
}

interface Clause {
  id: string;
  text: string;
  lineIndex: number;
}

export const DocumentView: React.FC<DocumentViewProps> = ({ contract, userProfile, onBack }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showClauses, setShowClauses] = useState(false);
  
  // Analysis State
  const [analysisData, setAnalysisData] = useState<ContractAnalysis | undefined>(contract.analysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  
  const [isCopied, setIsCopied] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnalysisData(contract.analysis);
  }, [contract.analysis]);

  // Auto-focus search input
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  // Auto-scroll to current match
  useEffect(() => {
    if (isSearchOpen && matchCount > 0) {
        // Debounce slightly to allow DOM to paint
        const timer = setTimeout(() => {
            const matches = document.querySelectorAll('mark');
            if (matches[currentMatchIndex]) {
                matches[currentMatchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [currentMatchIndex, matchCount, isSearchOpen]);

  // Extract Clauses (Table of Contents) logic
  const clauses = useMemo(() => {
    if (!contract.content) return [];
    const lines = contract.content.split('\n');
    const extracted: Clause[] = [];
    const clauseRegex = /^(제\s*[0-9]+\s*조|\d+\.|Article\s+[0-9]+)/i;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (clauseRegex.test(trimmed)) {
            extracted.push({
                id: `clause-${index}`,
                text: trimmed.substring(0, 40) + (trimmed.length > 40 ? '...' : ''),
                lineIndex: index
            });
        }
    });
    return extracted;
  }, [contract.content]);

  // Scroll to specific clause
  const scrollToClause = (lineIndex: number) => {
    const element = document.getElementById(`line-${lineIndex}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight effect
        element.classList.add('bg-blue-100');
        setTimeout(() => element.classList.remove('bg-blue-100'), 1500);
        
        // On mobile, close the menu
        if (window.innerWidth < 768) {
            setShowClauses(false);
        }
    }
  };

  const handleNextMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchCount);
  };

  const handlePrevMatch = () => {
    if (matchCount === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchCount) % matchCount);
  };

  const handleAnalyzeContract = async () => {
    if (!contract.content) return;

    setIsAnalyzing(true);
    try {
        // Use backend API for analysis
        const response = await fetch(`${API_BASE_URL}/ai/quick-analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contract_text: contract.content,
            business_type: userProfile?.businessType,
            business_description: userProfile?.businessDescription,
            legal_concerns: userProfile?.legalConcerns,
          }),
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.status}`);
        }

        const result = await response.json();

        const mappedRisks = (result.risks || []).map((r: { id?: string; title: string; description: string; level: string }, index: number) => ({
            id: r.id || `risk_${index}`,
            title: r.title,
            description: r.description,
            level: r.level as RiskLevel
        }));

        setAnalysisData({
            summary: result.summary,
            score: result.score,
            risks: mappedRisks,
            questions: result.questions || []
        });
    } catch (error) {
        console.error("Analysis failed:", error);
        toast.error(t('document.analysisError'));
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Rendering Content with Highlighting and Line IDs
  const renderContent = () => {
    if (!contract.content) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Search size={48} className="mb-4 opacity-20" />
                <p>{t('document.noContent')}</p>
            </div>
        );
    }

    const lines = contract.content.split('\n');
    let totalMatches = 0;
    
    // Optimize regex creation: create only once per render if query exists
    const searchRegex = searchQuery.trim() 
        ? new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') 
        : null;

    return (
        <div className="font-serif text-sm md:text-base text-slate-800 leading-relaxed font-normal">
            {lines.map((line, lineIndex) => {
                if (!line.trim()) return <br key={lineIndex} />;

                const parts = [];
                let lastIndex = 0;
                
                if (searchRegex) {
                    searchRegex.lastIndex = 0; // Reset lastIndex for each line
                    let match;
                    while ((match = searchRegex.exec(line)) !== null) {
                        if (match.index > lastIndex) {
                            parts.push(line.substring(lastIndex, match.index));
                        }
                        const isCurrent = totalMatches === currentMatchIndex;
                        parts.push(
                            <mark 
                                key={`${lineIndex}-${match.index}`} 
                                className={`${isCurrent ? 'bg-orange-400 text-white' : 'bg-yellow-200 text-slate-900'} rounded-sm px-0.5 transition-colors duration-200`}
                            >
                                {match[0]}
                            </mark>
                        );
                        totalMatches++;
                        lastIndex = searchRegex.lastIndex;
                    }
                }
                
                if (lastIndex < line.length) {
                    parts.push(line.substring(lastIndex));
                }

                const isClause = /^(제\s*[0-9]+\s*조|\d+\.|Article\s+[0-9]+)/i.test(line.trim());

                return (
                    <div 
                        key={lineIndex} 
                        id={`line-${lineIndex}`}
                        className={`min-h-[1.5em] transition-colors duration-500 ${isClause ? 'font-bold text-slate-900 mt-4 mb-2 scroll-mt-32' : ''}`}
                    >
                        {parts.length > 0 ? parts : line}
                    </div>
                );
            })}
            <MatchCountUpdater count={totalMatches} setCount={setMatchCount} />
        </div>
    );
  };

  const getRiskLabel = (level: RiskLevel) => {
      switch(level) {
          case RiskLevel.High: return t('risk.high');
          case RiskLevel.Medium: return t('risk.medium');
          case RiskLevel.Low: return t('risk.low');
          default: return level;
      }
  };

  const handleCopySummary = () => {
    if (analysisData?.summary) {
      navigator.clipboard.writeText(analysisData.summary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Improved Context Search Logic
  const searchForContext = (text: string) => {
      const words = text.replace(/[^a-zA-Z0-9가-힣\s]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      let bestKeyword = '';
      if (contract.content) {
          const sortedWords = [...words].sort((a, b) => b.length - a.length);
          for (const word of sortedWords) {
              if (contract.content.includes(word)) {
                  bestKeyword = word;
                  break; 
              }
          }
      }
      if (!bestKeyword && words.length > 0) {
          bestKeyword = words[0];
      }
      setIsSearchOpen(true);
      setSearchQuery(bestKeyword || '');
      setShowAnalysis(false);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <header className="flex flex-col border-b border-slate-100 bg-white z-20 shadow-sm shrink-0 transition-all">
        <div className="flex justify-between items-center px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50 text-slate-600">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h2 className="font-bold text-slate-800 text-sm truncate max-w-[150px] sm:max-w-md">
              {contract.title}
            </h2>
            <span className="text-[10px] text-slate-400">{t('document.viewer')}</span>
          </div>
          <div className="flex gap-1">
             <button
               onClick={() => {
                   setShowClauses(!showClauses);
                   setShowAnalysis(false);
               }}
               className={`relative p-2 rounded-full transition-colors ${showClauses ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-500'}`}
               title={t('document.tableOfContents')}
            >
              <List size={20} />
              {clauses.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
              )}
            </button>
            <button
               onClick={() => {
                 setIsSearchOpen(!isSearchOpen);
                 if (isSearchOpen) setSearchQuery('');
                 setShowClauses(false);
               }}
               className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-500'}`}
               title={t('common.search')}
            >
              <Search size={20} />
            </button>
            <button
               onClick={() => {
                   setShowAnalysis(!showAnalysis);
                   setShowClauses(false);
               }}
               className={`p-2 rounded-full transition-colors ${showAnalysis ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-50 text-slate-500'}`}
               title={t('document.aiAnalysis')}
            >
              <Sparkles size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 flex items-center gap-2">
                <div className="flex-1 bg-slate-100 rounded-lg flex items-center px-3 py-2 text-sm">
                    <Search size={14} className="text-slate-400 mr-2" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t('document.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNextMatch()}
                        className="bg-transparent border-none outline-none w-full text-slate-700 placeholder:text-slate-400"
                    />
                    {matchCount > 0 && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap mr-2">
                            {currentMatchIndex + 1} / {matchCount}
                        </span>
                    )}
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className="flex gap-1">
                    <button onClick={handlePrevMatch} disabled={matchCount === 0} className="p-2 bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 active:bg-slate-200">
                        <ArrowUp size={16} />
                    </button>
                    <button onClick={handleNextMatch} disabled={matchCount === 0} className="p-2 bg-slate-100 rounded-lg text-slate-600 disabled:opacity-50 active:bg-slate-200">
                        <ArrowDown size={16} />
                    </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Document Text */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 pb-24 scroll-smooth">
           <div className="bg-white p-8 shadow-sm min-h-full max-w-3xl mx-auto rounded-lg">
             {renderContent()}
           </div>
        </div>

        {/* Clause Navigator (TOC) Overlay */}
        <AnimatePresence>
            {showClauses && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-4 right-4 max-h-[60%] w-64 bg-white/95 backdrop-blur shadow-xl border border-slate-100 rounded-xl z-30 flex flex-col overflow-hidden"
                >
                    <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-xs text-slate-500 uppercase tracking-wide flex justify-between items-center">
                        <span>{t('document.tableOfContentsJump')}</span>
                        <button onClick={() => setShowClauses(false)}><X size={14}/></button>
                    </div>
                    <div className="overflow-y-auto p-2">
                        {clauses.length > 0 ? (
                            clauses.map((clause) => (
                                <button
                                    key={clause.id}
                                    onClick={() => scrollToClause(clause.lineIndex)}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors truncate flex items-center gap-2 group"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 group-hover:bg-blue-400 transition-colors"></span>
                                    <span className="truncate">{clause.text}</span>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400">
                                {t('document.noClausesDetected')}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Persistent Floating Analysis Button */}
        <AnimatePresence>
          {!showAnalysis && analysisData && !showClauses && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setShowAnalysis(true)}
              className="absolute bottom-6 right-6 z-30 bg-slate-900 text-white pl-4 pr-5 py-3 rounded-full shadow-xl shadow-slate-300 flex items-center gap-2 hover:bg-slate-800 active:scale-95 transition-all"
            >
              <div className="relative">
                <AlertTriangle size={20} className="text-orange-400" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                </span>
              </div>
              <span className="font-bold text-sm">{t('document.viewAiAnalysis')}</span>
            </motion.button>
          )}
          {!showAnalysis && !analysisData && !showClauses && contract.content && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setShowAnalysis(true)}
                className="absolute bottom-6 right-6 z-30 bg-blue-600 text-white pl-4 pr-5 py-3 rounded-full shadow-xl shadow-blue-300 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
              >
                  <Sparkles size={20} className="text-yellow-300" />
                  <span className="font-bold text-sm">{t('document.aiDetailedAnalysis')}</span>
              </motion.button>
          )}
        </AnimatePresence>

        {/* Sidebar Analysis Overlay */}
        <AnimatePresence>
          {showAnalysis && (
            <>
              {/* Backdrop for mobile */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAnalysis(false)}
                className="absolute inset-0 bg-slate-900/20 z-30 md:hidden"
              />
              
              {/* Sidebar Panel */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col"
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500" />
                    {t('document.aiAnalysisReport')}
                  </h3>
                  <button onClick={() => setShowAnalysis(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {userProfile && (
                     <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                             <User size={12} className="text-indigo-600" />
                             <span className="text-[10px] font-bold text-indigo-600 uppercase">{t('document.customAnalysisApplied')}</span>
                        </div>
                        <p className="text-xs text-indigo-800 leading-tight">
                            {t('document.customAnalysisDesc', { businessType: userProfile.businessType })}
                        </p>
                     </div>
                  )}

                  {isAnalyzing ? (
                      <div className="flex flex-col items-center justify-center py-20">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="text-blue-500 mb-4"
                          >
                              <RefreshCw size={32} />
                          </motion.div>
                          <p className="text-slate-600 font-medium">{t('document.analyzingContract')}</p>
                          <p className="text-xs text-slate-400 mt-1">{t('document.ragAnalysisInProgress')}</p>
                      </div>
                  ) : analysisData ? (
                    <>
                      {/* Summary Section */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-blue-600 uppercase">{t('report.summary')}</p>
                            <button
                                onClick={handleCopySummary}
                                className="p-1 -mr-1 rounded-md text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                                title={t('document.copySummary')}
                            >
                                {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{analysisData.summary}</p>
                      </div>

                      {/* Risks Section */}
                      <div>
                        <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                            <AlertTriangle size={12} /> {t('report.detectedRisks')}
                        </p>
                        <div className="space-y-3">
                          {analysisData.risks.map(risk => (
                            <div key={risk.id} className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-sm text-slate-800">{risk.title}</span>
                                <RiskBadge level={risk.level} label={getRiskLabel(risk.level)} />
                              </div>
                              <p className="text-xs text-slate-500 mt-1 mb-2">{risk.description}</p>
                              
                              <button
                                onClick={() => searchForContext(risk.title)}
                                className="w-full mt-1 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 transition-colors group"
                              >
                                <Search size={12} className="text-slate-400 group-hover:text-blue-500" />
                                {t('document.findRelatedClause')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Questions Section */}
                      {analysisData.questions && analysisData.questions.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide flex items-center gap-1">
                                <HelpCircle size={12} /> {t('report.suggestedQuestions')}
                            </p>
                            <div className="space-y-3">
                                {analysisData.questions.map((q, i) => (
                                    <div key={i} className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
                                        <div className="flex gap-2 items-start mb-3">
                                            <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i+1}</span>
                                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{q}</p>
                                        </div>
                                        <button
                                            onClick={() => searchForContext(q)}
                                            className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 transition-colors group"
                                        >
                                            <Search size={12} className="text-slate-400 group-hover:text-blue-500" />
                                            {t('document.searchRelatedContent')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                      )}
                      
                      {/* Re-analyze Button */}
                       <div className="pt-4 mt-4 border-t border-slate-100">
                          <button
                            onClick={handleAnalyzeContract}
                            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                             <RefreshCw size={16} /> {t('document.rerunAnalysis')}
                          </button>
                       </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Sparkles size={40} className="mb-4 text-slate-200" />
                        <p className="mb-4">{t('document.noAnalysisData')}</p>
                        <button
                            onClick={handleAnalyzeContract}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Sparkles size={16} /> {t('document.startDetailedAnalysis')}
                        </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MatchCountUpdater: React.FC<{ count: number; setCount: (n: number) => void }> = ({ count, setCount }) => {
    useEffect(() => {
        setCount(count);
    }, [count, setCount]);
    return null;
};

const RiskBadge: React.FC<{ level: RiskLevel; label?: string }> = ({ level, label }) => {
  const styles = {
    [RiskLevel.High]: "bg-red-100 text-red-700",
    [RiskLevel.Medium]: "bg-orange-100 text-orange-700",
    [RiskLevel.Low]: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${styles[level]}`}>
      {label || level}
    </span>
  );
};