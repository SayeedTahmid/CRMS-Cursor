// frontend/src/services/users.ts
import api from './api';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  tenant_id?: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
}

export const usersService = {
    list: async (): Promise<UsersResponse> => {
      const response = await api.get('/users');
      return response.data; // { users, total }
    },
    invite: async (email: string, role: string = 'viewer') => {
      const response = await api.post('/users/invite', { email, role });
      return response.data;
    },
    setRole: async (uid: string, role: string) => {
      const response = await api.put(`/users/${encodeURIComponent(uid)}/role`, { role });
      return response.data;
    }
  };
  