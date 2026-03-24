import React from 'react';
import { Layout, MessageSquare, Plus, Trash2, Github, ExternalLink, LogOut, Pencil, Check, X, Sun, Moon, Folder, ChevronDown } from 'lucide-react';
import { Button } from './common/Button';
import { useTheme } from '../context/ThemeContext';
import { lockSession, verifySessionPin } from '../services/api';
import { Lock } from 'lucide-react';

interface SidebarProps {
  sessions: { session_id: string; name: string; folder?: string | null; is_locked?: boolean }[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onClearHistory: () => void;
  onRenameSession: (id: string, name: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onUpdateFolder: (id: string, folder: string | null) => Promise<void>;
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
  onUpdateFolder,
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
  const [editFolder, setEditFolder] = React.useState('');
  const [collapsedFolders, setCollapsedFolders] = React.useState<string[]>([]);

  const [verifyingSession, setVerifyingSession] = React.useState<any | null>(null);
  const [pinInput, setPinInput] = React.useState('');
  const [unlockedSessions, setUnlockedSessions] = React.useState<string[]>([]);
  const [isLocking, setIsLocking] = React.useState<string | null>(null);
  const [newPin, setNewPin] = React.useState('');

  const handleSelectSession = async (session: any) => {
    if (session.is_locked && !unlockedSessions.includes(session.session_id)) {
      setVerifyingSession(session);
      setPinInput('');
      return;
    }
    onSelectSession(session.session_id);
  };

  const handleVerifyPin = async () => {
    if (!verifyingSession) return;
    try {
      const res = await verifySessionPin(verifyingSession.session_id, pinInput);
      if (res.unlocked) {
        setUnlockedSessions([...unlockedSessions, verifyingSession.session_id]);
        onSelectSession(verifyingSession.session_id);
        setVerifyingSession(null);
      } else {
        alert("Invalid PIN!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLockSession = async (sessionId: string) => {
    if (newPin.length !== 4) {
      alert("PIN must be 4 digits");
      return;
    }
    try {
      await lockSession(sessionId, newPin);
      alert("Session locked with PIN!");
      setIsLocking(null);
      setNewPin('');
    } catch (err) {
      console.error(err);
    }
  };

  // Group sessions by folder
  const folders = sessions.reduce((acc, sess) => {
    const f = sess.folder || 'Default';
    if (!acc[f]) acc[f] = [];
    acc[f].push(sess);
    return acc;
  }, {} as Record<string, typeof sessions>);

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
            Object.entries(folders).map(([folderName, folderSessions]) => (
              <div key={folderName} className="space-y-1">
                <button 
                  onClick={() => setCollapsedFolders(prev => prev.includes(folderName) ? prev.filter(f => f !== folderName) : [...prev, folderName])}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Folder size={14} className="text-primary-400" />
                    <span className="capitalize">{folderName}</span>
                  </div>
                  <ChevronDown size={14} className={`transform transition-transform ${collapsedFolders.includes(folderName) ? '-rotate-90' : ''}`} />
                </button>

                {!collapsedFolders.includes(folderName) && (
                  <div className="pl-3 space-y-1 border-l border-white/5 ml-2">
                    {folderSessions.map((session) => (
                      <div key={session.session_id} className="w-full relative group">
                        {editingId === session.session_id ? (
                          <form 
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (editName.trim()) {
                                await onRenameSession(session.session_id, editName.trim());
                                await onUpdateFolder(session.session_id, editFolder.trim() || null);
                                setEditingId(null);
                              }
                            }}
                            className="w-full flex flex-col gap-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10"
                          >
                            <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-transparent border-none text-sm text-white focus:outline-none w-full"
                              placeholder="Session Name"
                            />
                            <div className="flex items-center gap-1 w-full justify-between">
                              <input 
                                type="text" 
                                value={editFolder}
                                onChange={(e) => setEditFolder(e.target.value)}
                                className="bg-transparent border-none text-xs text-gray-400 focus:outline-none w-full"
                                placeholder="Folder (optional)"
                              />
                              <div className="flex items-center">
                                <button type="submit" className="text-green-500 hover:text-green-400 p-0.5"><Check size={14} /></button>
                                <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-400 p-0.5"><X size={14} /></button>
                              </div>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center w-full group">
                            <button
                              onClick={() => handleSelectSession(session)}
                              className={`flex-1 text-left px-2.5 py-2 rounded-l-lg text-sm transition-all duration-200 flex items-center gap-2 truncate ${
                                currentSessionId === session.session_id 
                                  ? 'bg-primary-600/15 text-primary-400 border-y border-l border-primary-600/20' 
                                  : 'text-gray-400 hover:bg-white/5 hover:text-white border-y border-l border-transparent'
                              }`}
                            >
                              <MessageSquare size={14} className={currentSessionId === session.session_id ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'} />
                              <span className="truncate max-w-[120px] flex items-center gap-1">
                                 {session.name}
                                 {session.is_locked && <Lock size={11} className={unlockedSessions.includes(session.session_id) ? "text-green-400" : "text-primary-400"} />}
                               </span>
                            </button>
                            <div className={`flex items-center px-1 rounded-r-lg border-y border-r transition-all ${
                                currentSessionId === session.session_id 
                                  ? 'bg-primary-600/15 border-primary-600/20 border-y border-r' 
                                  : 'hover:bg-white/5 border-border border-y border-r border-transparent'
                              }`}>
                              {!session.is_locked && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setIsLocking(session.session_id); }}
                                  className="text-gray-500 hover:text-primary-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Lock size={12} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(session.session_id);
                                  setEditName(session.name);
                                  setEditFolder(session.folder || '');
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
                    ))}
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

      {isLocking && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
            <div className="bg-card border border-border rounded-xl p-5 text-center space-y-4 max-w-xs shadow-2xl">
               <Lock className="text-primary-400 w-8 h-8 mx-auto" />
               <h3 className="text-sm font-bold text-white">Set Session PIN</h3>
               <p className="text-xs text-gray-400">Enter a 4-digit PIN to lock this workspace.</p>
               <input 
                 type="password"
                 maxLength={4}
                 value={newPin}
                 onChange={(e) => setNewPin(e.target.value)}
                 placeholder="● ● ● ●"
                 className="bg-black/50 border border-border rounded-lg px-3 py-2 text-center text-lg tracking-widest font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
               />
               <div className="flex gap-2">
                  <Button onClick={() => setIsLocking(null)} variant="ghost" className="flex-1">Cancel</Button>
                  <Button onClick={() => handleLockSession(isLocking)} className="flex-1">Lock</Button>
               </div>
            </div>
         </div>
      )}

      {verifyingSession && (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
            <div className="bg-card border border-border rounded-xl p-5 text-center space-y-4 max-w-xs shadow-2xl">
               <Lock className="text-primary-400 w-8 h-8 mx-auto" />
               <h3 className="text-sm font-bold text-white">Unlock Workspace</h3>
               <p className="text-xs text-gray-400">Enter 4-digit PIN to access this session.</p>
               <input 
                 type="password"
                 maxLength={4}
                 value={pinInput}
                 onChange={(e) => setPinInput(e.target.value)}
                 placeholder="● ● ● ●"
                 className="bg-black/50 border border-border rounded-lg px-3 py-2 text-center text-lg tracking-widest font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary-500 w-full"
               />
               <div className="flex gap-2">
                  <Button onClick={() => setVerifyingSession(null)} variant="ghost" className="flex-1">Cancel</Button>
                  <Button onClick={handleVerifyPin} className="flex-1">Unlock</Button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
