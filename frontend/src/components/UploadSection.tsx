import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Info } from 'lucide-react';
import { Button } from './common/Button';
import { uploadPdf } from '../services/api';

interface UploadSectionProps {
  onUploadSuccess: (sessionId: string, chunks: number) => void;
  currentSessionId: string | null;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onUploadSuccess,
  currentSessionId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Only PDF files are allowed.");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadPdf(file, currentSessionId || undefined);
      onUploadSuccess(result.session_id, result.chunks);
      setFile(null);
    } catch (err: any) {
      let message = "Upload failed. Please try again.";
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        message = "Request timed out. The server may be waking up — please wait a moment and try again.";
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (!err.response) {
        message = "Could not reach the server. Please check your connection and try again.";
      }
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white">Knowledge Ingestion</h2>
        <p className="text-gray-500 text-lg">Upload your documents and interact with them using context-aware AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div 
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-12 text-center group ${
              dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-border bg-card'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center mx-auto">
                  <FileText className="text-primary-500 w-8 h-8" />
                </div>
                <div>
                  <p className="text-white font-semibold">{file.name}</p>
                  <p className="text-gray-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button 
                   onClick={(e: React.MouseEvent) => { e.stopPropagation(); setFile(null); }}
                   variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                >
                  Remove file
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                  <Upload className="text-gray-400 w-10 h-10 group-hover:text-primary-400 transition-colors" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white mb-2">Click or drag PDF to upload</p>
                  <p className="text-gray-500">FastAPI will process and index the document</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between bg-card/50 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Info className="text-orange-500 w-5 h-5" />
               </div>
               <div>
                  <p className="text-sm font-bold text-white">Security Note</p>
                  <p className="text-xs text-gray-500">Documents are processed securely and indexed for your session only.</p>
               </div>
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={!file || isUploading} 
              isLoading={isUploading}
              className="px-8"
            >
              {isUploading ? "Processing..." : "Ingest Document"}
            </Button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400 animate-shake">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-card rounded-2xl border border-border p-6 space-y-6 shadow-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <div className="w-2 h-6 bg-primary-500 rounded-full"></div>
                 How it works
              </h3>
              <ul className="space-y-4">
                 <li className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                    <p className="text-sm text-gray-400 leading-relaxed">PDF is uploaded and context is extracted using <span className="text-white font-medium">PyMuPDF</span>.</p>
                 </li>
                 <li className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Smart chunking preserves semantics for better retrieval accuracy.</p>
                 </li>
                 <li className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Embeddings are generated and stored in a temporary vector index.</p>
                 </li>
                 <li className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                    <p className="text-sm text-gray-400 leading-relaxed">Session ID is persisted for continuity across interactions.</p>
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
