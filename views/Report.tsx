import React, { useEffect, useState } from 'react';
import { ContractAnalysis, RiskLevel, RiskPoint } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AlertTriangle, HelpCircle, CheckCircle, Share2, Mail, FileText, ShieldAlert, ShieldCheck, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportProps {
  analysis: ContractAnalysis;
  onDone: () => void;
}

export const Report: React.FC<ReportProps> = ({ analysis, onDone }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Simple count-up animation
    let start = 0;
    const end = analysis.score;
    const duration = 1000;
    const incrementTime = duration / end; 

    // Handle 0 score case or very fast animation
    if (end === 0) return;

    const timer = setInterval(() => {
      start += 1;
      setDisplayScore(start);
      if (start === end) clearInterval(timer);
    }, Math.max(incrementTime, 10)); // Min 10ms per step

    return () => clearInterval(timer);
  }, [analysis.score]);


  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (score >= 60) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };
  
  const handleShare = async () => {
      const shareData = {
          title: '계약서 AI 안전 진단 리포트',
          text: `SafeContract 분석 결과: 안전 점수 ${analysis.score}점.\n\n요약: ${analysis.summary}`,
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
          alert('리포트 내용이 클립보드에 복사되었습니다.');
      }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`[SafeContract] 계약서 AI 분석 리포트 - ${analysis.score}점`);
    const body = encodeURIComponent(
`SafeContract 계약서 분석 결과입니다.

안전 점수: ${analysis.score}점
요약: ${analysis.summary}

주요 위험 요소: ${analysis.risks.length}건 발견

--------------------------------------------------
SafeContract - 프리랜서와 소상공인을 위한 AI 법률 비서
`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const circleRadius = 60;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (analysis.score / 100) * circumference;

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
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
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">안전점수</span>
                        <div className={`flex items-baseline ${getScoreColor(analysis.score).replace('stroke-', '')}`}>
                             <span className="text-5xl font-extrabold tracking-tighter">{displayScore}</span>
                             <span className="text-lg font-medium text-slate-400 ml-1">/100</span>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            <div className="text-center max-w-xs">
                <h2 className="text-xl font-bold text-slate-800 mb-2">
                    {analysis.score >= 80 ? '계약서가 안전합니다' : analysis.score >= 60 ? '몇 가지 주의가 필요합니다' : '위험 요소가 발견되었습니다'}
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                    AI가 분석한 결과를 바탕으로<br/>계약 체결 전 꼼꼼히 확인해보세요.
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
                    <FileText size={16} /> 요약
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
                        <ShieldAlert size={16} /> 위험 요소
                    </h3>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {analysis.risks.length}건 감지됨
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
                    <HelpCircle size={16} /> 추천 질문
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

       {/* Actions */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] max-w-md mx-auto">
            <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-slate-200" onClick={handleShare}>
                    <Share2 size={18} /> <span className="ml-2">공유</span>
                </Button>
                <Button fullWidth onClick={onDone} className="flex-[2]">
                    확인 완료
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
    let classes = "";
    let label = "";
    
    switch(level) {
        case RiskLevel.High:
            classes = "bg-rose-100 text-rose-700";
            label = "위험";
            break;
        case RiskLevel.Medium:
            classes = "bg-amber-100 text-amber-700";
            label = "주의";
            break;
        default:
            classes = "bg-slate-100 text-slate-600";
            label = "참고";
    }

    return (
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${classes}`}>
            {label}
        </span>
    );
};