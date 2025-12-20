import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, User, Bot, AlertCircle, Database } from 'lucide-react';
import { UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";

interface LegalQAProps {
  userProfile?: UserProfile;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const LegalQA: React.FC<LegalQAProps> = ({ userProfile, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      text: `안녕하세요. ${userProfile?.name || '고객'}님의 법률 AI 비서입니다.\n${userProfile?.businessType ? `'${userProfile.businessType}'` : ''} 업무와 관련하여 궁금한 점이 있으신가요? 상황을 말씀해 주시면 판례와 법령을 바탕으로 분석해 드립니다.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Prepare RAG Context
        let contextSystemInstruction = "You are a helpful AI legal assistant for the Korean legal system.";
        if (userProfile) {
            contextSystemInstruction += `
            [USER PROFILE CONTEXT]
            - Name: ${userProfile.name}
            - Job/Business: ${userProfile.businessType}
            - Description: ${userProfile.businessDescription}
            - Known Legal Concerns: ${userProfile.legalConcerns}
            
            Tailor your advice to be relevant to a ${userProfile.businessType}. 
            If the query relates to their known concerns, reference them.
            Always provide answers in Korean.
            `;
        }

        // Construct conversation history for the model
        const chat = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: contextSystemInstruction
            },
            history: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }))
        });

        const result = await chat.sendMessage({ message: input });
        
        if (result.text) {
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: result.text };
            setMessages(prev => [...prev, aiMsg]);
        }
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: '죄송합니다. 오류가 발생하여 답변을 생성할 수 없습니다.' }]);
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center gap-2 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
            <h2 className="font-bold text-slate-800">법적 쟁점 분석</h2>
            <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-emerald-600 font-medium">Personalized AI Agent Active</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {userProfile?.businessType && (
             <div className="flex justify-center mb-4">
                 <div className="bg-slate-100 rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-200">
                    <Database size={10} />
                    <span>{userProfile.businessType} 맞춤형 지식 베이스 가동 중</span>
                 </div>
             </div>
        )}

        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-2 text-xs text-orange-800 mb-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>본 상담 내용은 법적 효력이 없으며 참고용으로만 활용하세요. 정확한 판단을 위해서는 반드시 변호사와 상담하시기 바랍니다.</p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-100 text-emerald-600'}`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="flex gap-2">
               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                 <Bot size={16} />
               </div>
               <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex gap-1 items-center">
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                 <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="상황을 자세히 설명해주세요..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};