import React from 'react';
import { Layout, MessageSquare, Plus, Trash2, Github, ExternalLink } from 'lucide-react';
import { Button } from './common/Button';

interface SidebarProps {
  sessions: { id: string; name: string }[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onClearHistory: () => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;
  topK: number;
  setTopK: (k: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onClearHistory,
  backendUrl,
  setBackendUrl,
  topK,
  setTopK,
}) => {
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
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 group ${
                  currentSessionId === session.id 
                    ? 'bg-primary-600/15 text-primary-400 border border-primary-600/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <MessageSquare size={16} className={currentSessionId === session.id ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'} />
                <span className="truncate">{session.name}</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">System Settings</h2>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
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
