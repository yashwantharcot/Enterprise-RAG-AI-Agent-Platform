import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: { idx: number; score: number }[];
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <MessageSquareIcon className="text-gray-600 w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start a conversation</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Upload a PDF in the Knowledge Base tab to start asking questions about your document.
            </p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageItem key={idx} message={message} />
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
            className="w-full bg-card border border-border rounded-xl px-5 py-4 pr-14 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-xl disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !sessionId}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-500 transition-all disabled:opacity-50 disabled:bg-gray-700 active:scale-90"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="mt-3 text-center">
           <p className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">
             AI can make mistakes. Verify important information.
           </p>
        </div>
      </div>
    </div>
  );
};

const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
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
                      <div key={idx} className="bg-black/30 border-l-2 border-primary-500 rounded-r-lg p-3 text-xs text-gray-400 leading-relaxed">
                        <span className="text-[10px] font-bold text-primary-400 mb-1 block uppercase">Source Chunk {source.idx + 1} • Similarity: {(source.score * 100).toFixed(1)}%</span>
                        Match found in the document context.
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
