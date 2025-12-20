import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Copy, Check, FileEdit, Download, History, Save, X, RotateCcw, Clock, Bold, Italic, Underline } from 'lucide-react';
import { Button } from '../components/Button';
import { STANDARD_TEMPLATES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface TemplatePreviewProps {
  templateId: string;
  onBack: () => void;
  onUseTemplate: (content: string) => void;
}

interface Version {
  id: string;
  label: string;
  content: string;
  timestamp: Date;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({ templateId, onBack, onUseTemplate }) => {
  const template = STANDARD_TEMPLATES[templateId];
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Initialize content and versions
  const [content, setContent] = useState(template?.content || '');
  const [isCopied, setIsCopied] = useState(false);
  
  // History State
  const [versions, setVersions] = useState<Version[]>(() => [
    { 
      id: 'initial', 
      label: '원본 템플릿', 
      content: template?.content || '', 
      timestamp: new Date() 
    }
  ]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Formatting State
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  });

  // Initialize editor content on mount
  useEffect(() => {
    if (editorRef.current && template) {
        // Since the initial template is plain text, setting innerText preserves newlines properly with white-space: pre-wrap
        editorRef.current.innerText = template.content;
    }
  }, [templateId]); 

  if (!template) {
    return (
        <div className="h-screen flex items-center justify-center flex-col">
            <p className="text-slate-500 mb-4">템플릿을 찾을 수 없습니다.</p>
            <Button onClick={onBack}>돌아가기</Button>
        </div>
    );
  }

  const checkFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline')
    });
  };

  const handleFormat = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) {
        setContent(editorRef.current.innerHTML);
        editorRef.current.focus();
        checkFormats();
    }
  };

  const handleCopy = () => {
    const textToCopy = editorRef.current ? editorRef.current.innerText : content;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
     const element = document.createElement("a");
     const textToDownload = editorRef.current ? editorRef.current.innerText : content;
     const file = new Blob([textToDownload], {type: 'text/plain;charset=utf-8'});
     element.href = URL.createObjectURL(file);
     element.download = `${template.title.replace(/\s+/g, '_')}.txt`;
     document.body.appendChild(element);
     element.click();
     document.body.removeChild(element);
  };

  const handleSaveVersion = () => {
    const newVersion: Version = {
      id: Date.now().toString(),
      label: `수정본 ${versions.length}`,
      content: content, // Saves HTML
      timestamp: new Date()
    };
    setVersions(prev => [newVersion, ...prev]);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleRestoreVersion = (version: Version) => {
    if (window.confirm('현재 작성 중인 내용이 선택한 버전으로 대체됩니다. 계속하시겠습니까?')) {
      setContent(version.content);
      if (editorRef.current) {
          if (version.id === 'initial') {
              editorRef.current.innerText = version.content;
          } else {
              editorRef.current.innerHTML = version.content;
          }
      }
      setShowHistory(false);
    }
  };

  const handleUseTemplateClick = () => {
    // Extract plain text for compatibility with the document viewer
    let textToUse = "";
    if (editorRef.current) {
        textToUse = editorRef.current.innerText;
    } else {
        // Fallback: strip HTML from content if editorRef is unavailable
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        textToUse = tempDiv.innerText || tempDiv.textContent || "";
    }
    onUseTemplate(textToUse);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center shadow-sm shrink-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="font-bold text-slate-800 text-center truncate flex-1 px-2">
          {template.title}
        </h2>
        <button 
          onClick={() => setShowHistory(true)}
          className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${showHistory ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
          title="히스토리"
        >
          <History size={22} />
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col relative z-10">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden relative">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-1">
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleFormat('bold'); }}
                        className={`p-1.5 rounded-md transition-colors ${activeFormats.bold ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                        title="굵게"
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleFormat('italic'); }}
                        className={`p-1.5 rounded-md transition-colors ${activeFormats.italic ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                        title="기울임"
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleFormat('underline'); }}
                        className={`p-1.5 rounded-md transition-colors ${activeFormats.underline ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                        title="밑줄"
                    >
                        <Underline size={16} />
                    </button>
                </div>

                <div className="flex gap-1">
                    <button 
                        onClick={handleSaveVersion}
                        className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="버전 저장"
                    >
                        {isSaved ? <Check size={16} className="text-blue-600"/> : <Save size={16} />}
                    </button>
                    <div className="w-px h-4 bg-slate-200 my-auto mx-1"></div>
                    <button 
                        onClick={handleCopy}
                        className="p-1.5 rounded-md text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="복사하기"
                    >
                        {isCopied ? <Check size={16} className="text-green-600"/> : <Copy size={16} />}
                    </button>
                     <button 
                        onClick={handleDownload}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                        title="TXT 다운로드"
                    >
                        <Download size={16} />
                    </button>
                </div>
            </div>

            <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onKeyUp={checkFormats}
                onMouseUp={checkFormats}
                className="flex-1 w-full p-6 outline-none font-serif text-slate-800 leading-relaxed text-sm md:text-base overflow-y-auto selection:bg-blue-100 whitespace-pre-wrap [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
                spellCheck={false}
                suppressContentEditableWarning
            />
        </div>
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          내용을 자유롭게 수정하고 서식을 적용할 수 있습니다.
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-20">
        <Button fullWidth onClick={handleUseTemplateClick} className="flex items-center justify-center gap-2">
            <FileEdit size={18} />
            이 템플릿으로 계약서 작성
        </Button>
      </div>

      {/* History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-slate-900/20 z-30"
            />
            
            {/* Sidebar */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <History size={18} className="text-blue-500" />
                  버전 히스토리
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {versions.map((version, index) => (
                  <div key={version.id} className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                            {version.label}
                            {index === 0 && versions.length > 1 && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">최신</span>
                            )}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Clock size={10} />
                          {version.timestamp.toLocaleTimeString()} 
                          <span className="mx-1">•</span>
                          {version.content.replace(/<[^>]*>/g, '').length}자
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRestoreVersion(version)}
                        className="p-1.5 rounded-full bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="이 버전으로 복구"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 line-clamp-2 font-serif bg-slate-50 p-2 rounded">
                        {version.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                    </div>
                  </div>
                ))}
                
                {versions.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                        <p>저장된 버전이 없습니다.</p>
                    </div>
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 text-center">
                저장 버튼을 누르면 현재 상태가 히스토리에 기록됩니다.
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};