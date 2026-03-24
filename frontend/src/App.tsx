import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import type { Message } from './components/ChatWindow';
import { UploadSection } from './components/UploadSection';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { queryPdf, getHistory, getRecentSessions, renameSession, deleteSession, updateSessionFolder } from './services/api';

const DEFAULT_BACKEND_URL = import.meta.env.VITE_API_URL || 'https://retrival-augmented-generation-ai-agent-backend-production.up.railway.app';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentSessions, setRecentSessions] = useState<{ session_id: string; name: string }[]>([]);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND_URL);
  const [topK, setTopK] = useState(5);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load session from URL
  useEffect(() => {
    if (!token) return; // Wait for auth
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sid');
    if (sid) {
      setSessionId(sid);
      setActiveTab('chat');
    }
    
    // Load recent sessions from Backend
    const fetchSessions = async () => {
      try {
        const sessions = await getRecentSessions();
        setRecentSessions(sessions);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };
    if (token) fetchSessions();
  }, [token]);

  // Persist session to URL and localStorage
  useEffect(() => {
    if (sessionId && token) {
      const url = new URL(window.location.href);
      url.searchParams.set('sid', sessionId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [sessionId, token]);

  const addRecentSession = (id: string, name: string) => {
    setRecentSessions((prev) => {
      const filtered = prev.filter(s => s.session_id !== id);
      return [{ session_id: id, name }, ...filtered];
    });
  };

  const handleUploadSuccess = (sid: string, chunks: number) => {
    setSessionId(sid);
    addRecentSession(sid, `Doc (${chunks} chunks)`);
    setActiveTab('chat');
  };

  const handleSendMessage = async (content: string, translateTo?: string) => {
    if (!sessionId) return;

    const userMessage: Message = { role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/pdf-qa/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          session_id: sessionId, 
          query: content, 
          top_k: topK, 
          model: selectedModel, 
          system_prompt: selectedPersona,
          translate_to: translateTo && translateTo !== 'None' ? translateTo : undefined
        })
      });

      if (!response.ok) throw new Error(`Query failed: ${response.statusText}`);

      setMessages((prev) => [...prev, { role: 'assistant', content: "", sources: [] }]);
      const t0 = performance.now();
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          if (frame.startsWith('data: ')) {
            try {
              const data = JSON.parse(frame.slice(6));
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (data.answer) last.content += data.answer;
                if (data.sources) last.sources = data.sources;
                return updated;
              });
            } catch (e) { }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }

      const t1 = performance.now();
      const duration = (t1 - t0) / 1000;

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          last.stats = {
            duration: Number(duration.toFixed(1)),
            words: last.content.trim().split(/\s+/).filter(Boolean).length
          };
        }
        return updated;
      });
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setSessionId(null);
    setMessages([]);
    setRecentSessions([]);
  };

  if (!token) {
    return authView === 'login' ? (
      <Login 
        onLoginSuccess={(t) => {
          localStorage.setItem('token', t);
          setToken(t);
        }} 
        onToggleToRegister={() => setAuthView('register')} 
      />
    ) : (
      <Register 
        onRegisterSuccess={() => setAuthView('login')} 
        onToggleToLogin={() => setAuthView('login')} 
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-white overflow-hidden">
      <Sidebar
        sessions={recentSessions}
        currentSessionId={sessionId}
        onSelectSession={async (id) => {
          setSessionId(id);
          setActiveTab('chat');
          try {
            const hist = await getHistory(id);
            setMessages(hist);
          } catch (err) {
            console.error("Failed to fetch history:", err);
          }
        }}
        onNewSession={handleNewSession}
        onClearHistory={handleClearHistory}
        onRenameSession={async (id, name) => {
          await renameSession(id, name);
          setRecentSessions((prev) => prev.map(s => s.session_id === id ? { ...s, name } : s));
        }}
        onDeleteSession={async (id) => {
          await deleteSession(id);
          setRecentSessions((prev) => prev.filter(s => s.session_id !== id));
          if (sessionId === id) {
            setSessionId(null);
            setMessages([]);
          }
        }}
        backendUrl={backendUrl}
        setBackendUrl={setBackendUrl}
        topK={topK}
        setTopK={setTopK}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedPersona={selectedPersona}
        setSelectedPersona={setSelectedPersona}
        onUpdateFolder={async (id, folder) => {
          await updateSessionFolder(id, folder);
          setRecentSessions((prev) => prev.map(s => s.session_id === id ? { ...s, folder } : s));
        }}
        onLogout={handleLogout}
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
