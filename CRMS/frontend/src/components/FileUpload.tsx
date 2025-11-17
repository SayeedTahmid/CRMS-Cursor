// frontend/src/components/FileUpload.tsx
import React, { useState, useRef } from 'react';
import api from '../services/api';
import { PaperClipIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  entityType: 'customer' | 'log' | 'complaint' | 'general';
  entityId?: string;
  onUploadComplete: (file: any) => void;
  onFileRemove: (fileId: string) => void;
  existingFiles?: Array<{ id: string; original_filename: string; public_url?: string; size?: number }>;
  maxFiles?: number;
  maxSize?: number; // in MB
}

const FileUpload: React.FC<FileUploadProps> = ({
  entityType,
  entityId,
  onUploadComplete,
  onFileRemove,
  existingFiles = [],
  maxFiles = 10,
  maxSize = 10,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    const totalFiles = existingFiles.length + uploadedFiles.length + files.length;
    
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB > maxSize) {
        setError(`File "${file.name}" exceeds ${maxSize}MB limit`);
        continue;
      }

      await uploadFile(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      if (entityId) {
        formData.append('entityId', entityId);
      }
      formData.append('description', '');

      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadedFile = response.data.file;
      setUploadedFiles(prev => [...prev, uploadedFile]);
      onUploadComplete(uploadedFile);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to upload ${file.name}`);
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await api.delete(`/files/${fileId}`);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      onFileRemove(fileId);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete file');
    }
  };

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await api.get(`/files/download/${fileId}`);
      const url = response.data.download_url;
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const allFiles = [...existingFiles, ...uploadedFiles];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-text-secondary">
          Attachments ({allFiles.length}/{maxFiles})
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || allFiles.length >= maxFiles}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary-purple hover:text-secondary-purple disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <PaperClipIcon className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Add File'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="bg-error/20 text-error p-2 rounded text-sm">{error}</div>
      )}

      {allFiles.length > 0 && (
        <div className="space-y-2">
          {allFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-dark-bg-secondary rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <PaperClipIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{file.original_filename || file.originalFilename}</p>
                  {file.size && (
                    <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
                  )}
                </div>
                {uploadedFiles.find(f => f.id === file.id) && (
                  <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2">
                {(file.public_url || file.publicUrl) && (
                  <button
                    type="button"
                    onClick={() => window.open(file.public_url || file.publicUrl, '_blank')}
                    className="text-sm text-primary-purple hover:text-secondary-purple"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownload(file.id, file.original_filename || file.originalFilename)}
                  className="text-sm text-primary-purple hover:text-secondary-purple"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1 text-error hover:text-error/80 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {allFiles.length === 0 && !uploading && (
        <p className="text-sm text-text-secondary text-center py-4">
          No files attached. Click "Add File" to upload attachments.
        </p>
      )}
    </div>
  );
};

export default FileUpload;

