import React from 'react';
import { Mail, MessageCircle, Scale, ChevronRight, FileText } from 'lucide-react';
import { Button } from '../components/Button';

interface LegalServicesProps {
  onNavigate: (view: 'CONTENT_PROOF' | 'LEGAL_QA') => void;
}

export const LegalServices: React.FC<LegalServicesProps> = ({ onNavigate }) => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">법률 지원 서비스</h1>
        <p className="text-slate-500 text-sm">복잡한 법률 문제, AI가 도와드립니다.</p>
      </div>

      <div className="space-y-4">
        {/* Content Proof Generator */}
        <button 
          onClick={() => onNavigate('CONTENT_PROOF')}
          className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all group text-left"
        >
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Mail size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">내용증명 작성</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              미수금, 계약 해지 등 의사 표시를 명확히 해야 할 때 법적 효력을 갖는 내용증명을 AI와 함께 작성하세요.
            </p>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-indigo-500" />
        </button>

        {/* Legal Q&A */}
        <button 
          onClick={() => onNavigate('LEGAL_QA')}
          className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5 hover:border-blue-200 hover:shadow-md transition-all group text-left"
        >
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <MessageCircle size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">법적 쟁점 분석</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              현재 겪고 있는 상황을 입력하면 AI가 법적 쟁점과 판례 기반의 대응 방안을 분석해 드립니다.
            </p>
          </div>
          <ChevronRight className="text-slate-300 group-hover:text-emerald-500" />
        </button>

        {/* Coming Soon */}
        <div className="w-full bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex items-center gap-5 opacity-60">
          <div className="w-14 h-14 bg-slate-200 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">
            <Scale size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-600 text-lg mb-1">변호사 매칭 (준비중)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              분석된 데이터를 바탕으로 전문 변호사를 연결해 드리는 서비스가 곧 오픈됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
