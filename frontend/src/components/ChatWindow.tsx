import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, ChevronDown, ChevronUp, BookOpen, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { idx: number; score: number; text: string; filename?: string }[];
  stats?: { duration: number; words: number };
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, translateTo?: string) => void;
  isLoading: boolean;
  sessionId: string | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSendMessage,
  isLoading,
  sessionId,
}) => {
  const [input, setInput] = useState('');
  const [showPdf, setShowPdf] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [translateTo, setTranslateTo] = useState<string>('None');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      if (transcript) {
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input, translateTo);
      setInput('');
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;

    let mdContent = `# Chat Session Export\n\n`;
    messages.forEach((msg) => {
      mdContent += `### ${msg.role === 'user' ? '👤 User' : '🤖 Doxi (Assistant)'}\n\n`;
      mdContent += `${msg.content}\n\n`;
      if (msg.sources && msg.sources.length > 0) {
        mdContent += `**Sources Cited:**\n`;
        msg.sources.forEach(src => {
          mdContent += `- [Excerpt ${src.idx + 1}] (Score: ${src.score.toFixed(2)}): ${src.text}\n`;
        });
        mdContent += `\n`;
      }
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_session_${sessionId || 'export'}.md`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-[#0d1117]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-gray-300">Active Chat Session</h2>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <>
              <button 
                onClick={() => {
                  setShowPdf(!showPdf);
                  if (!currentPdf && messages.flatMap(m => m.sources || []).length > 0) {
                     const firstWithFile = messages.flatMap(m => m.sources || []).find(s => s.filename);
                     if (firstWithFile?.filename) setCurrentPdf(firstWithFile.filename);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 border ${
                  showPdf 
                    ? 'bg-primary-600 text-white border-primary-500 shadow-lg shadow-primary-500/20' 
                    : 'bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 border-primary-600/20'
                }`}
              >
                <BookOpen size={14} />
                {showPdf ? 'Hide PDF' : 'View PDF'}
              </button>
              <button 
                onClick={handleExport}
                className="px-3 py-1.5 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 text-xs font-medium transition-all flex items-center gap-2 border border-primary-600/20"
              >
                Export Chat (.md)
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex w-full h-full overflow-hidden">
        {/* Left Column: Messages List and Input */}
        <div className={`flex flex-col h-full ${showPdf ? 'w-1/2 border-r border-border' : 'w-full'} overflow-hidden`}>
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Bot className="text-gray-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Start a conversation</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Upload a PDF in the Knowledge Base tab to start asking questions about your document.
                </p>
              </div>
            ) : (
              messages.map((message, idx) => (
                <MessageItem 
                  key={idx} 
                  message={message} 
                  onSourceClick={(filename) => {
                    setCurrentPdf(filename);
                    setShowPdf(true);
                  }}
                />
              ))
            )}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0">
                  <Bot className="text-primary-500 w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-border bg-black/20 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={sessionId ? "Ask a question about your document..." : "Upload a PDF to start chatting"}
                disabled={!sessionId || isLoading}
                className="w-full bg-card border border-border rounded-xl px-5 py-4 pr-24 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-xl disabled:opacity-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <select
                  value={translateTo}
                  onChange={(e) => setTranslateTo(e.target.value)}
                  disabled={!sessionId || isLoading}
                  className="bg-black/30 border border-border rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 max-w-[80px] truncate [&>option]:bg-[#161b22] [&>option]:text-white"
                >
                  <option value="None">Off</option>
                  <option value="Spanish">Español</option>
                  <option value="French">Français</option>
                  <option value="German">Deutsch</option>
                  <option value="Hindi">हिंदी</option>
                  <option value="Chinese">中文</option>
                </select>
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={!sessionId || isLoading}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isListening ? 'bg-red-500 hover:bg-red-400 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'} disabled:opacity-50`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || !sessionId}
                  className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500 transition-all disabled:opacity-50 disabled:bg-gray-700 active:scale-90"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
            <div className="mt-3 text-center">
               <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">
                 AI can make mistakes. Verify important information.
               </p>
            </div>
          </div>
        </div>

        {/* Right Column: PDF Viewer */}
        {showPdf && (
           <div className="w-1/2 h-full bg-[#161b22] flex flex-col">
             {currentPdf ? (
               <embed 
                 src={`http://127.0.0.1:8000/api/pdf-qa/file/${sessionId}/${currentPdf}`} 
                 type="application/pdf"
                 className="w-full h-full"
               />
             ) : (
               <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                 Click a citation to view file context.
               </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ message: Message; onSourceClick: (filename: string) => void }> = ({ message, onSourceClick }) => {
  const [showSources, setShowSources] = useState(false);
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${isAssistant ? '' : 'flex-row-reverse'}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
        isAssistant 
          ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-primary-500/10' 
          : 'bg-[#30363d] text-gray-300'
      }`}>
        {isAssistant ? <Bot size={20} /> : <User size={20} />}
      </div>
      
      <div className={`flex flex-col max-w-[85%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-[15px] font-normal leading-relaxed ${
          isAssistant 
            ? 'bg-[#21262d] text-gray-100 border border-border' 
            : 'bg-primary-600 text-white'
        }`}>
          {message.content}
        </div>

        {isAssistant && message.stats && (
          <div className="mt-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 flex items-center gap-1.5 text-[10px] text-gray-500 font-medium select-none">
            <span className="flex items-center gap-0.5 text-primary-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {message.stats.duration}s
            </span>
            <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
            <span>{message.stats.words} words</span>
          </div>
        )}
        
        {isAssistant && message.sources && message.sources.length > 0 && (
          <div className="mt-2 w-full">
            <button 
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-wider"
            >
              <BookOpen size={13} />
              {showSources ? 'Hide Sources' : `View ${message.sources.length} Sources`}
              {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            <AnimatePresence>
              {showSources && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {message.sources.map((source, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => source.filename && onSourceClick(source.filename)}
                        className={`bg-black/30 border-l-2 border-primary-500 rounded-r-lg p-3 text-xs text-slate-300 leading-relaxed select-text ${source.filename ? 'cursor-pointer hover:bg-white/5 transition-all' : ''}`}
                      >
                        <span className="text-[10px] font-bold text-primary-400 mb-1 block uppercase flex items-center justify-between">
                          <span>Source Chunk {source.idx + 1} • Similarity: {(source.score * 100).toFixed(1)}%</span>
                          {source.filename && <span className="text-gray-500 normal-case font-normal border border-gray-800 px-1 rounded bg-black/40">{source.filename}</span>}
                        </span>
                        {source.text}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const MessageSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
