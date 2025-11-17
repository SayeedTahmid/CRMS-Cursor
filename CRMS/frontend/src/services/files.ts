// frontend/src/services/files.ts
import api from './api';

export interface FileMetadata {
  id: string;
  entity_type: string;
  entity_id: string;
  original_filename: string;
  storage_path: string;
  public_url?: string;
  content_type: string;
  size: number;
  description?: string;
  uploaded_by: string;
  created_at: string;
}

export const fileService = {
  upload: async (
    file: File,
    entityType: 'customer' | 'log' | 'complaint' | 'general',
    entityId?: string,
    description?: string
  ): Promise<FileMetadata> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (entityId) {
      formData.append('entityId', entityId);
    }
    if (description) {
      formData.append('description', description);
    }

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.file;
  },

  getById: async (fileId: string): Promise<FileMetadata> => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  delete: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  getEntityFiles: async (
    entityType: string,
    entityId: string
  ): Promise<{ files: FileMetadata[]; total: number }> => {
    const response = await api.get(`/files/entity/${entityType}/${entityId}`);
    return response.data;
  },

  getDownloadUrl: async (fileId: string): Promise<{ download_url: string; filename: string; content_type: string }> => {
    const response = await api.get(`/files/download/${fileId}`);
    return response.data;
  },
};

