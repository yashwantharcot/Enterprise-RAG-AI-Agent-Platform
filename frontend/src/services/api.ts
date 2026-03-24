import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://retrival-augmented-generation-ai-agent-backend-production.up.railway.app';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface UploadResponse {
  session_id: string;
  chunks: number;
}

export interface QueryRequest {
  session_id: string;
  query: string;
  top_k?: number;
}

export interface QueryResponse {
  answer: string;
  sources: { idx: number; score: number }[];
  session_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export const register = async (req: RegisterRequest): Promise<{ message: string; user_id: string }> => {
  const response = await api.post<{ message: string; user_id: string }>('/auth/register', req);
  return response.data;
};

export const login = async (req: LoginRequest): Promise<{ access_token: string; refresh_token: string; token_type: string }> => {
  const response = await api.post<{ access_token: string; refresh_token: string; token_type: string }>('/auth/login', req);
  return response.data;
};

export const uploadPdf = async (file: File, sessionId?: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }
  
  const response = await api.post<UploadResponse>('/pdf-qa/upload_pdf', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const uploadUrl = async (url: string, sessionId?: string): Promise<UploadResponse> => {
  const response = await api.post<UploadResponse>('/pdf-qa/upload_url', {
    url,
    session_id: sessionId || undefined
  });
  return response.data;
};

export const queryPdf = async (req: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post<QueryResponse>('/pdf-qa/query', req);
  return response.data;
};

export const getHistory = async (sessionId: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> => {
  const response = await api.get<{ role: 'user' | 'assistant'; content: string }[]>(`/pdf-qa/history/${sessionId}`);
  return response.data;
};

export interface DocumentItem {
  filename: string;
  chunks: number;
  uploaded_at: string | null;
}

export const getDocuments = async (sessionId: string): Promise<DocumentItem[]> => {
  const response = await api.get<DocumentItem[]>(`/pdf-qa/documents/${sessionId}`);
  return response.data;
};

export const deleteDocument = async (sessionId: string, filename: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/pdf-qa/documents/${sessionId}/${filename}`);
  return response.data;
};

export interface SessionItem {
  session_id: string;
  name: string;
  folder?: string | null;
}

export const getRecentSessions = async (): Promise<SessionItem[]> => {
  const response = await api.get<SessionItem[]>('/pdf-qa/recent_sessions');
  return response.data;
};

export const renameSession = async (sessionId: string, name: string): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>(`/pdf-qa/sessions/${sessionId}?name=${encodeURIComponent(name)}`);
  return response.data;
};

export const deleteSession = async (sessionId: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/pdf-qa/sessions/${sessionId}`);
  return response.data;
};

export const updateSessionFolder = async (sessionId: string, folder: string | null): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>(`/pdf-qa/sessions/${sessionId}/folder`, null, {
    params: folder ? { folder } : {}
  });
  return response.data;
};

export interface WorkspaceStats {
  chunks: number;
  queries: number;
  files_count: number;
  files: string[];
}

export const getSessionStats = async (sessionId: string): Promise<WorkspaceStats> => {
  const response = await api.get<WorkspaceStats>(`/pdf-qa/stats/${sessionId}`);
  return response.data;
};

export const lockSession = async (sessionId: string, pin: string): Promise<{ message: string }> => {
  const response = await api.put<{ message: string }>(`/pdf-qa/sessions/${sessionId}/pin`, null, {
    params: { pin }
  });
  return response.data;
};

export const verifySessionPin = async (sessionId: string, pin: string): Promise<{ unlocked: boolean }> => {
  const response = await api.post<{ unlocked: boolean }>(`/pdf-qa/sessions/${sessionId}/verify_pin`, null, {
    params: { pin }
  });
  return response.data;
};

export default api;
