import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send, User, Bot, AlertCircle, Database, History, Plus, Trash2, X } from 'lucide-react';
import { UserProfile } from '../types';
import { conversationStorage, Conversation, StoredMessage } from '../services/conversationStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

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
  const { t, i18n } = useTranslation();

  const getInitialMessage = (): Message => {
    const name = userProfile?.name || t('common.customer', 'Customer');
    const businessType = userProfile?.businessType ? `'${userProfile.businessType}'` : '';
    const text = i18n.language === 'ko'
      ? `안녕하세요. ${name}님의 법률 AI 비서입니다.\n${businessType} 업무와 관련하여 궁금한 점이 있으신가요? 상황을 말씀해 주시면 판례와 법령을 바탕으로 분석해 드립니다.`
      : `Hello. I am your AI legal assistant, ${name}.\n${businessType ? `For your ${businessType} work, ` : ''}do you have any questions? Please describe your situation and I will analyze it based on case law and regulations.`;
    return { id: '1', role: 'assistant', text };
  };

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    setConversations(conversationStorage.getAll());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Save conversation when messages change
  useEffect(() => {
    if (messages.length > 1 && currentConversation) {
      const updatedConversation: Conversation = {
        ...currentConversation,
        messages: messages.map(m => ({ ...m, timestamp: Date.now() })),
        title: conversationStorage.generateTitle(messages as StoredMessage[]),
        updatedAt: Date.now()
      };
      conversationStorage.save(updatedConversation);
      setCurrentConversation(updatedConversation);
      setConversations(conversationStorage.getAll());
    }
  }, [messages.length]);

  const startNewConversation = () => {
    const newConv = conversationStorage.createNew();
    setCurrentConversation(newConv);
    setMessages([getInitialMessage()]);
    setShowHistory(false);
  };

  const loadConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    setMessages(conv.messages.map(m => ({ id: m.id, role: m.role, text: m.text })));
    setShowHistory(false);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    conversationStorage.delete(id);
    setConversations(conversationStorage.getAll());
    if (currentConversation?.id === id) {
      startNewConversation();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Create new conversation if none exists
    if (!currentConversation) {
      const newConv = conversationStorage.createNew();
      setCurrentConversation(newConv);
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        // Call backend API instead of direct Gemini
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            history: messages.map(m => ({
              role: m.role,
              text: m.text
            })),
            user_profile: userProfile ? {
              name: userProfile.name,
              businessType: userProfile.businessType,
              businessDescription: userProfile.businessDescription,
              legalConcerns: userProfile.legalConcerns
            } : undefined
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.response) {
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', text: result.response };
            setMessages(prev => [...prev, aiMsg]);
        }
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: t('legalQA.error', 'Sorry, an error occurred and I cannot generate a response.') }]);
    } finally {
        setIsTyping(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return i18n.language === 'ko' ? '오늘' : 'Today';
    if (days === 1) return i18n.language === 'ko' ? '어제' : 'Yesterday';
    if (days < 7) return i18n.language === 'ko' ? `${days}일 전` : `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      {/* History Sidebar */}
      {showHistory && (
        <div className="absolute inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowHistory(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{i18n.language === 'ko' ? '대화 기록' : 'Chat History'}</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 rounded-full hover:bg-slate-100"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors"
              >
                <Plus size={16} />
                {i18n.language === 'ko' ? '새 대화' : 'New Chat'}
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-120px)] px-2">
              {conversations.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">
                  {i18n.language === 'ko' ? '저장된 대화가 없습니다' : 'No saved conversations'}
                </p>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv)}
                    className={`w-full text-left p-3 rounded-lg mb-1 group hover:bg-slate-100 transition-colors ${
                      currentConversation?.id === conv.id ? 'bg-slate-100' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-slate-700 truncate flex-1 pr-2">
                        {conv.title}
                      </p>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(conv.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center gap-2 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-50 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
            <h2 className="font-bold text-slate-800">{t('legalQA.title')}</h2>
            <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-emerald-600 font-medium">{t('legalQA.agentActive')}</p>
            </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="p-2 rounded-full hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          data-testid="btn-chat-history"
        >
          <History size={22} className="text-slate-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {userProfile?.businessType && (
             <div className="flex justify-center mb-4">
                 <div className="bg-slate-100 rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] text-slate-500 border border-slate-200">
                    <Database size={10} />
                    <span>{userProfile.businessType} {t('legalQA.knowledgeBase')}</span>
                 </div>
             </div>
        )}

        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-2 text-xs text-orange-800 mb-4">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{t('legal.disclaimer')}</p>
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
            placeholder={t('legalQA.inputPlaceholder')}
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