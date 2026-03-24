import React from 'react';
import { Layout, MessageSquare, Plus, Trash2, Github, ExternalLink, LogOut, Pencil, Check, X, Sun, Moon } from 'lucide-react';
import { Button } from './common/Button';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  sessions: { session_id: string; name: string }[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onClearHistory: () => void;
  onRenameSession: (id: string, name: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  topK: number;
  setTopK: (k: number) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedPersona: string;
  setSelectedPersona: (persona: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onClearHistory,
  onRenameSession,
  onDeleteSession,
  backendUrl,
  setBackendUrl,
  topK,
  setTopK,
  selectedModel,
  setSelectedModel,
  selectedPersona,
  setSelectedPersona,
  onLogout,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const { theme, setTheme, accent, setAccent } = useTheme();
  const [editName, setEditName] = React.useState('');

  return (
    <div className="w-80 h-full bg-sidebar border-r border-border flex flex-col pt-6 pb-4">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Layout className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">PDF AI Agent</h1>
      </div>

      <div className="px-4 mb-6">
        <Button onClick={onNewSession} className="w-full justify-start gap-2" variant="primary">
          <Plus size={18} />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <div className="space-y-1">
          <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Sessions</h2>
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-gray-500 italic">No recent sessions</p>
          ) : (
            sessions.map((session) => (
              <div key={session.session_id} className="w-full relative group">
                {editingId === session.session_id ? (
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (editName.trim()) {
                        await onRenameSession(session.session_id, editName.trim());
                        setEditingId(null);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                  >
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-transparent border-none text-sm text-white focus:outline-none w-full"
                      autoFocus
                    />
                    <button type="submit" className="text-green-500 hover:text-green-400"><Check size={14} /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-400"><X size={14} /></button>
                  </form>
                ) : (
                  <div className="flex items-center w-full group">
                    <button
                      onClick={() => onSelectSession(session.session_id)}
                      className={`flex-1 text-left px-3 py-2.5 rounded-l-lg text-sm transition-all duration-200 flex items-center gap-3 truncate ${
                        currentSessionId === session.session_id 
                          ? 'bg-primary-600/15 text-primary-400 border-y border-l border-primary-600/20' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white border-y border-l border-transparent'
                      }`}
                    >
                      <MessageSquare size={16} className={currentSessionId === session.session_id ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'} />
                      <span className="truncate max-w-[150px]">{session.name}</span>
                    </button>
                    <div className={`flex items-center px-1.5 rounded-r-lg border-y border-r transition-all ${
                        currentSessionId === session.session_id 
                          ? 'bg-primary-600/15 border-primary-600/20 border-y border-r' 
                          : 'hover:bg-white/5 border-border border-y border-r border-transparent'
                      }`}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(session.session_id);
                          setEditName(session.name);
                        }}
                        className="text-gray-500 hover:text-primary-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Delete this session from history and workspace documents?")) {
                            await onDeleteSession(session.session_id);
                          }
                        }}
                        className="text-gray-500 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">System Settings</h2>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <label className="text-xs text-gray-400">Theme</label>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-md bg-black/40 border border-border text-gray-400 hover:text-white transition-all flex items-center gap-1 text-xs"
              >
                {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
            
            <div className="border-b border-white/10 pb-2">
              <label className="text-xs text-gray-400 mb-2 block">Accent</label>
              <div className="flex gap-2">
                {(['blue', 'purple', 'green', 'orange'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setAccent(c)}
                    className={`w-5 h-5 rounded-full border-2 ${accent === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'} transition-all`}
                    style={{ 
                      backgroundColor: 
                        c === 'blue' ? '#0e90e9' : 
                        c === 'purple' ? '#8b5cf6' : 
                        c === 'green' ? '#10b981' : '#f97316' 
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Backend API URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full bg-black/40 border border-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">AI Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-black/40 border border-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all [&>option]:bg-[#161b22] [&>option]:text-white"
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 (Groq)</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-2 block">AI Persona</label>
              <select
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="w-full bg-black/40 border border-border rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all [&>option]:bg-[#161b22] [&>option]:text-white"
              >
                <option value="">General Assistant</option>
                <option value="You are an expert legal analyst. Focus on terms, risks, and compliance strictly.">Legal Analyst</option>
                <option value="You are a friendly teacher. Explain concepts simply with examples for beginners.">Friendly Teacher</option>
                <option value="You are a senior code reviewer. Focus on optimization, safety, and conciseness.">Code Reviewer</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-gray-400">Context Window</label>
                <span className="text-xs text-primary-400 font-medium">{topK} chunks</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto px-4 pt-4 border-t border-border space-y-2">
        {currentSessionId && (
          <Button 
            onClick={onClearHistory} 
            variant="danger" 
            size="sm" 
            className="w-full justify-start gap-2"
          >
            <Trash2 size={14} />
            Clear Current History
          </Button>
        )}
        <Button 
          onClick={onLogout} 
          variant="secondary" 
          size="sm" 
          className="w-full justify-start gap-2 bg-red-950/20 text-red-500 hover:bg-red-950/40 border border-red-900/40 mt-2"
        >
          <LogOut size={14} />
          Logout
        </Button>
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              <Github size={18} />
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">
              <ExternalLink size={18} />
            </a>
          </div>
          <span className="text-[10px] text-gray-600 font-medium uppercase tracking-widest">v1.2.0</span>
        </div>
      </div>
    </div>
  );
};
