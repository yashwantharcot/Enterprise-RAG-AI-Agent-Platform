import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import type { Message } from './components/ChatWindow';
import { UploadSection } from './components/UploadSection';
import { queryPdf } from './services/api';

const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_URL || 'https://retrival-augmented-generation-ai-agent-backend-production.up.railway.app';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentSessions, setRecentSessions] = useState<{ id: string; name: string }[]>([]);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [topK, setTopK] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  // Load session from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      setSessionId(sid);
      setActiveTab('chat');
    }
    
    // Load recent sessions from localStorage
    const saved = localStorage.getItem('recent_sessions');
    if (saved) {
      setRecentSessions(JSON.parse(saved));
    }
  }, []);

  // Persist session to URL and localStorage
  useEffect(() => {
    if (sessionId) {
      const url = new URL(window.location.href);
      url.searchParams.set('sid', sessionId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [sessionId]);

  const addRecentSession = (id: string, name: string) => {
    setRecentSessions((prev) => {
      const filtered = prev.filter(s => s.id !== id);
      const updated = [{ id, name }, ...filtered].slice(0, 10);
      localStorage.setItem('recent_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUploadSuccess = (sid: string, chunks: number) => {
    setSessionId(sid);
    addRecentSession(sid, `Doc (${chunks} chunks)`);
    setActiveTab('chat');
  };

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const resp = await queryPdf({
        session_id: sessionId,
        query: content,
        top_k: topK,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: resp.answer,
        sources: resp.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Query failed:", err);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error while searching the document." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setActiveTab('upload');
    const url = new URL(window.location.href);
    url.searchParams.delete('sid');
    window.history.replaceState({}, '', url.toString());
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-white overflow-hidden">
      <Sidebar
        sessions={recentSessions}
        currentSessionId={sessionId}
        onSelectSession={(id) => {
          setSessionId(id);
          setActiveTab('chat');
        }}
        onNewSession={handleNewSession}
        onClearHistory={handleClearHistory}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        topK={topK}
        setTopK={setTopK}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Tabs */}
        <div className="px-8 pt-6 border-b border-border bg-sidebar/30 backdrop-blur-md sticky top-0 z-10">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-4 text-sm font-bold tracking-wider uppercase transition-all relative ${
                activeTab === 'upload' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Knowledge Base
              {activeTab === 'upload' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-500 rounded-t-full shadow-[0_-4px_10px_rgba(14,144,233,0.5)]"></div>}
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-4 text-sm font-bold tracking-wider uppercase transition-all relative ${
                activeTab === 'chat' ? 'text-primary-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              AI Chat
              {activeTab === 'chat' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-500 rounded-t-full shadow-[0_-4px_10px_rgba(14,144,233,0.5)]"></div>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'upload' ? (
            <div className="h-full overflow-y-auto custom-scrollbar">
              <UploadSection 
                onUploadSuccess={handleUploadSuccess} 
                currentSessionId={sessionId} 
              />
            </div>
          ) : (
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              sessionId={sessionId}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
