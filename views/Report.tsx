import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ContractAnalysis, RiskLevel, RiskPoint } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AlertTriangle, HelpCircle, CheckCircle, Share2, Mail, FileText, ShieldAlert, ShieldCheck, Info, Download, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../components/Toast';
import { analysisApi } from '../services/api';

interface ReportProps {
  analysis?: ContractAnalysis;
  analysisId?: string;
  onDone: () => void;
}

// Helper to safely convert severity string to RiskLevel enum
const mapSeverityToRiskLevel = (severity: string): RiskLevel => {
  const upper = severity?.toUpperCase() || '';
  if (upper === 'HIGH') return RiskLevel.High;
  if (upper === 'MEDIUM') return RiskLevel.Medium;
  return RiskLevel.Low;
};

export const Report: React.FC<ReportProps> = ({ analysis: propAnalysis, analysisId, onDone }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(propAnalysis || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch analysis if analysisId is provided and no analysis prop
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!propAnalysis && analysisId) {
        setIsLoading(true);
        setError(null);
        try {
          const response = await analysisApi.getAnalysis(analysisId);

          // Map backend response to frontend ContractAnalysis type
          const mappedAnalysis: ContractAnalysis = {
            summary: response.summary,
            score: response.safety_score,
            risks: response.risks.map((risk, index) => ({
              id: `risk-${index}`,
              title: risk.type,
              description: risk.description,
              level: mapSeverityToRiskLevel(risk.severity)
            })),
            questions: response.questions
          };

          setAnalysis(mappedAnalysis);
        } catch (err) {
          console.error('Failed to fetch analysis:', err);
          setError(err instanceof Error ? err.message : 'Failed to load analysis');
          toast.error(t('common.error'));
        } finally {
          setIsLoading(false);
        }
      } else if (propAnalysis) {
        setAnalysis(propAnalysis);
      }
    };

    fetchAnalysis();
  }, [propAnalysis, analysisId, toast, t]);

  const handleExportPDF = async () => {
    if (!contentRef.current || isExporting || !analysis) return;

    setIsExporting(true);
    const originalScrollPos = window.scrollY;

    try {
      window.scrollTo(0, 0);
      await new Promise(resolve => setTimeout(resolve, 500));

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
        title: 'SafeContract AI Analysis Report',
        subject: 'Contract Safety Analysis',
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

      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`SafeContract_Report_${analysis.score}_${timestamp}.pdf`);
    } catch (e) {
      console.error('PDF export failed:', e);
      toast.error(t('common.error'));
    } finally {
      window.scrollTo(0, originalScrollPos);
      setIsExporting(false);
    }
  };

  useEffect(() => {
    // Reset display score when analysis.score changes
    setDisplayScore(0);

    // Handle null or 0 score case
    if (!analysis || analysis.score === 0) {
      return;
    }

    // Simple count-up animation
    let start = 0;
    const end = analysis.score;
    const duration = 1000;
    const incrementTime = Math.max(duration / end, 10); // Min 10ms per step

    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [analysis]);


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };
  
  const handleShare = async () => {
      if (!analysis) return;

      const shareData = {
          title: t('report.shareTitle', 'Contract AI Safety Report'),
          text: `SafeContract ${t('report.analysisResult', 'Analysis Result')}: ${t('report.safetyScore')} ${analysis.score}.\n\n${t('report.summary')}: ${analysis.summary}`,
          url: window.location.href
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Share error:', err);
          }
      } else {
          navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
          toast.success(t('report.copiedToClipboard', 'Report copied to clipboard.'));
      }
  };

  const handleEmailShare = () => {
    if (!analysis) return;

    const subject = encodeURIComponent(`[SafeContract] ${t('report.emailSubject', 'Contract AI Analysis Report')} - ${analysis.score}`);
    const body = encodeURIComponent(
`${t('report.emailBody', 'SafeContract Analysis Result')}

${t('report.safetyScore')}: ${analysis.score}
${t('report.summary')}: ${analysis.summary}

${t('report.risks')}: ${analysis.risks.length} ${t('report.detected')}

--------------------------------------------------
SafeContract - ${t('app.tagline')}
`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !analysis) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-6">
        <Card className="bg-white border-rose-200 shadow-sm p-6 max-w-md">
          <div className="text-center">
            <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t('common.error', 'Error')}</h2>
            <p className="text-slate-600 mb-4">{error || t('report.noAnalysis', 'No analysis data available')}</p>
            <Button onClick={onDone} fullWidth>
              {t('common.goBack', 'Go Back')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const circleRadius = 60;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (analysis.score / 100) * circumference;

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
       <div ref={contentRef}>
       {/* Top Score Section */}
       <div className={`pt-10 pb-12 px-6 flex flex-col items-center justify-center rounded-b-[2.5rem] shadow-sm border-b border-slate-100 bg-white`}>
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative mb-4"
            >
                <div className="relative flex items-center justify-center w-40 h-40">
                    {/* Background Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r={circleRadius}
                            stroke="#F1F5F9"
                            strokeWidth="12"
                            fill="transparent"
                        />
                        {/* Progress Circle */}
                        <motion.circle
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            cx="80"
                            cy="80"
                            r={circleRadius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeLinecap="round"
                            className={getScoreColor(analysis.score)}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('report.safetyScore')}</span>
                        <div className={`flex items-baseline ${getScoreColor(analysis.score).replace('stroke-', '')}`}>
                             <span className="text-5xl font-extrabold tracking-tighter">{displayScore}</span>
                             <span className="text-lg font-medium text-slate-400 ml-1">/100</span>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            <div className="text-center max-w-xs">
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {analysis.score >= 80 ? t('report.safe') : analysis.score >= 60 ? t('report.caution') : t('report.danger')}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    {t('report.description')}
                </p>
            </div>
       </div>

       <div className="p-6 space-y-6">
            {/* Summary */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                    <FileText size={16} /> {t('report.summary')}
                </h3>
                <Card className="bg-white border-slate-200 shadow-sm p-5">
                    <p className="text-slate-700 leading-relaxed text-sm font-medium">
                        {analysis.summary}
                    </p>
                </Card>
            </motion.section>

            {/* Risks */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex justify-between items-end mb-3 px-1">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert size={16} /> {t('report.risks')}
                    </h3>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {analysis.risks.length} {t('report.detected')}
                    </span>
                </div>
                
                <div className="space-y-3">
                    {analysis.risks.map((risk, idx) => (
                        <RiskCard key={idx} risk={risk} index={idx} />
                    ))}
                </div>
            </motion.section>

            {/* Questions */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                    <HelpCircle size={16} /> {t('report.questions')}
                </h3>
                <div className="bg-indigo-50 rounded-2xl p-1 border border-indigo-100">
                    <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                        <ul className="space-y-4">
                            {analysis.questions.map((q, idx) => (
                                <li key={idx} className="flex gap-3 text-sm text-slate-700 items-start">
                                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        Q{idx + 1}
                                    </div>
                                    <span className="leading-relaxed pt-0.5 font-medium">{q}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.section>
       </div>
       </div>

       {/* Actions */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] max-w-md mx-auto">
            <div className="flex gap-3">
                <Button
                    variant="outline"
                    className="flex-1 border-slate-200"
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    testId="btn-export-pdf"
                >
                    {isExporting ? (
                        <><Loader2 size={18} className="animate-spin" /> <span className="ml-2">{t('report.exporting')}</span></>
                    ) : (
                        <><Download size={18} /> <span className="ml-2">PDF</span></>
                    )}
                </Button>
                <Button variant="outline" className="flex-1 border-slate-200" onClick={handleShare} testId="btn-share-report">
                    <Share2 size={18} /> <span className="ml-2">{t('report.share')}</span>
                </Button>
                <Button fullWidth onClick={onDone} className="flex-[2]" testId="btn-done-report">
                    {t('report.done')}
                </Button>
            </div>
       </div>
    </div>
  );
};

const RiskCard: React.FC<{ risk: RiskPoint; index: number }> = ({ risk, index }) => {
    const isHigh = risk.level === RiskLevel.High;
    const isMedium = risk.level === RiskLevel.Medium;
    
    const borderColor = isHigh ? 'border-rose-200' : isMedium ? 'border-amber-200' : 'border-slate-200';
    const bgColor = isHigh ? 'bg-rose-50' : isMedium ? 'bg-amber-50' : 'bg-white';
    const iconColor = isHigh ? 'text-rose-500' : isMedium ? 'text-amber-500' : 'text-slate-400';
    const titleColor = isHigh ? 'text-rose-900' : isMedium ? 'text-amber-900' : 'text-slate-700';
    
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + (index * 0.1) }}
            className={`p-4 rounded-xl border ${borderColor} ${bgColor} shadow-sm`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className={iconColor} />
                    <h4 className={`font-bold text-sm ${titleColor}`}>{risk.title}</h4>
                </div>
                <Badge level={risk.level} />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed pl-6.5">
                {risk.description}
            </p>
        </motion.div>
    );
};

const Badge = ({ level }: { level: RiskLevel }) => {
    const { t } = useTranslation();
    let classes = "";
    let labelKey = "";

    switch(level) {
        case RiskLevel.High:
            classes = "bg-rose-100 text-rose-700";
            labelKey = "report.riskLevels.high";
            break;
        case RiskLevel.Medium:
            classes = "bg-amber-100 text-amber-700";
            labelKey = "report.riskLevels.medium";
            break;
        default:
            classes = "bg-slate-100 text-slate-600";
            labelKey = "report.riskLevels.low";
    }

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${classes}`}>
            {t(labelKey)}
        </span>
    );
};