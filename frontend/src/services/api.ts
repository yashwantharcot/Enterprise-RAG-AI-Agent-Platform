import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
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

export default api;
