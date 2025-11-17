// frontend/src/services/search.ts

/** Search API service */
import api from './api';

export interface SearchResult {
  customers?: any[];
  complaints?: any[];
  logs?: any[];
}

export interface SearchResponse {
  q: string;
  type: string;
  results: SearchResult;
}

export const searchService = {
  /**
   * Global search across customers, complaints, and logs
   */
  search: async (
    query: string,
    type: 'all' | 'customers' | 'complaints' | 'logs' = 'all',
    limit: number = 20
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      q: query,
      type,
      limit: limit.toString(),
    });

    const response = await api.get(`/search/search?${params.toString()}`);
    return response.data;
  },
};

