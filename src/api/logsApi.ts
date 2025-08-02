import axios, { type AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface APIRunResult {
  id: string;
  runId: string;
  itemName: string;
  requestName: string;
  method: string;
  url: string;
  statusCode: number | null;
  responseTime: number | null;
  success: boolean;
  errorMessage: string | null;
  responseBody: string | null;
  responseHeaders: Record<string, any> | null;
  assertions: Record<string, any> | null;
  timestamp: string;
}

export interface RunDetails {
  id: string;
  collectionId: string;
  configName: string;
  variableSetName: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startTime: string;
  endTime: string | null;
  totalRequests: number;
  passedRequests: number;
  failedRequests: number;
  totalTime: number;
  errorMessage: string | null;
  apiResults: APIRunResult[];
  collection: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface RealtimeAPIStatus {
  apiName: string;
  method: string;
  url: string;
  currentStatus: 'success' | 'failed' | 'pending' | 'unknown';
  lastRunTime: string | null;
  lastStatusCode: number | null;
  lastResponseTime: number | null;
  lastError: string | null;
  availability24h: number;
  totalRuns24h: number;
  successRuns24h: number;
}

export interface LogsError {
  message: string;
  status?: number;
  details?: string;
}

export const logsApi = {
  // Get detailed run information including all API results
  getRunDetails: async (runId: string): Promise<RunDetails> => {
    try {
      const response: AxiosResponse<RunDetails> = await api.get(`/api/tasks/runs/${runId}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to fetch run details: ${runId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: `An unexpected error occurred while fetching run details: ${runId}`,
      } as LogsError;
    }
  },

  // Get API run result details by result ID
  getAPIRunResult: async (resultId: string): Promise<APIRunResult> => {
    try {
      const response: AxiosResponse<APIRunResult> = await api.get(`/api/tasks/api-results/${resultId}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to fetch API result: ${resultId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: `An unexpected error occurred while fetching API result: ${resultId}`,
      } as LogsError;
    }
  },

  // Get recent runs for a collection
  getRecentRuns: async (collectionId: string, limit = 10): Promise<RunDetails[]> => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('limit', limit.toString());
      if (collectionId) queryParams.append('collectionId', collectionId);

      const response: AxiosResponse<RunDetails[]> = await api.get(
        `/api/tasks/runs?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch recent runs',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching recent runs',
      } as LogsError;
    }
  },

  // Get all runs (with pagination)
  getAllRuns: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    collectionId?: string;
  }): Promise<{
    runs: RunDetails[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.status) queryParams.append('status', params.status);
      if (params?.collectionId) queryParams.append('collectionId', params.collectionId);

      const response = await api.get(`/api/tasks/runs?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch runs',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching runs',
      } as LogsError;
    }
  },

  // Get real-time API status summary
  getRealtimeAPIStatus: async (collectionId?: string): Promise<RealtimeAPIStatus[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (collectionId) queryParams.append('collectionId', collectionId);

      const response: AxiosResponse<RealtimeAPIStatus[]> = await api.get(
        `/api/tasks/realtime-status?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch real-time API status',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching real-time API status',
      } as LogsError;
    }
  },

  // Get API results with filtering and pagination
  getAPIResults: async (params?: {
    runId?: string;
    collectionId?: string;
    success?: boolean;
    method?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    results: APIRunResult[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.runId) queryParams.append('runId', params.runId);
      if (params?.collectionId) queryParams.append('collectionId', params.collectionId);
      if (params?.success !== undefined) queryParams.append('success', params.success.toString());
      if (params?.method) queryParams.append('method', params.method);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`/api/tasks/api-results?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch API results',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching API results',
      } as LogsError;
    }
  },

  // Get live execution status (for real-time monitoring)
  getLiveExecutionStatus: async (): Promise<{
    activeRuns: number;
    pendingRuns: number;
    recentActivity: {
      runId: string;
      collectionName: string;
      status: string;
      startTime: string;
      progress?: number;
    }[];
  }> => {
    try {
      const response = await api.get('/api/tasks/live-status');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch live execution status',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as LogsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching live execution status',
      } as LogsError;
    }
  },
};

export default logsApi;