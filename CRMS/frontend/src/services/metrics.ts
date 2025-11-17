// frontend/src/services/metrics.ts

/** Metrics API service */
import api from './api';

export interface DashboardMetrics {
  active_customers: number;
  open_complaints: number;
  recent_logs_7d: number;
  performance_month: number;
}

export type MetricsSummary = DashboardMetrics;

export const metricsService = {
  /**
   * Get dashboard statistics
   */
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    try {
      const response = await api.get('/metrics');
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch metrics:', error);
      // Return zero values if metrics endpoint is unavailable
      return {
        active_customers: 0,
        open_complaints: 0,
        recent_logs_7d: 0,
        performance_month: 0,
      };
    }
  },
};

/**
 * Get metrics summary (wrapper for convenience)
 */
export async function getMetricsSummary(): Promise<MetricsSummary> {
  return metricsService.getDashboardMetrics();
}
