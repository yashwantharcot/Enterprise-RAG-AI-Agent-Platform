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

export const queryPdf = async (req: QueryRequest): Promise<QueryResponse> => {
  const response = await api.post<QueryResponse>('/pdf-qa/query', req);
  return response.data;
};

export const getHistory = async (sessionId: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> => {
  const response = await api.get<{ role: 'user' | 'assistant'; content: string }[]>(`/pdf-qa/history/${sessionId}`);
  return response.data;
};

export default api;
