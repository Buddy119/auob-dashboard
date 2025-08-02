import axios, { type AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CollectionConfig {
  name: string;
  data: {
    collectionName: string;
    collectionPath: string;
    environment?: Record<string, any>;
    globals?: Record<string, any>;
    environmentPath?: string;
    globalsPath?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface APIAvailabilityData {
  apiName: string;
  method: string;
  url: string;
  collectionId: string;
  availability: number;
  successCount: number;
  totalCount: number;
  status: 'high' | 'medium' | 'low';
}

export interface CollectionAvailabilityData {
  collectionId: string;
  collectionName: string;
  overallAvailability: number;
  totalAPIs: number;
  highAvailabilityAPIs: number;
  mediumAvailabilityAPIs: number;
  lowAvailabilityAPIs: number;
  apis: APIAvailabilityData[];
  lastUpdated: string;
}

export interface ReportData {
  id: string;
  type: string;
  format: string;
  startDate: string;
  endDate: string;
  summary: {
    totalAPIs: number;
    averageAvailability: number;
    totalRequests: number;
    successfulRequests: number;
    highAvailabilityCount: number;
    lowAvailabilityCount: number;
  };
  apiCount: number;
  createdAt: string;
}

export interface DashboardError {
  message: string;
  status?: number;
  details?: string;
}

export const dashboardApi = {
  // Get all collection configurations
  getCollections: async (): Promise<CollectionConfig[]> => {
    try {
      const response: AxiosResponse<CollectionConfig[]> = await api.get('/api/configs');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch collections',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: 'An unexpected error occurred while fetching collections',
      } as DashboardError;
    }
  },

  // Get specific collection configuration
  getCollection: async (name: string): Promise<CollectionConfig> => {
    try {
      const response: AxiosResponse<CollectionConfig> = await api.get(`/api/configs/${name}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to fetch collection: ${name}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: `An unexpected error occurred while fetching collection: ${name}`,
      } as DashboardError;
    }
  },

  // Get system availability data
  getSystemAvailability: async (): Promise<{
    overallAvailability: number;
    totalAPIs: number;
    collections: CollectionAvailabilityData[];
  }> => {
    try {
      const response = await api.get('/api/tasks/availability/system');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch system availability',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: 'An unexpected error occurred while fetching system availability',
      } as DashboardError;
    }
  },

  // Get collection-specific availability data
  getCollectionAvailability: async (collectionId: string): Promise<CollectionAvailabilityData> => {
    try {
      const response: AxiosResponse<CollectionAvailabilityData> = await api.get(
        `/api/tasks/availability/collection/${collectionId}`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to fetch collection availability: ${collectionId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: `An unexpected error occurred while fetching collection availability: ${collectionId}`,
      } as DashboardError;
    }
  },

  // Get availability trend data
  getAvailabilityTrend: async (params?: {
    startDate?: string;
    endDate?: string;
    apiName?: string;
    collectionId?: string;
  }): Promise<any> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.apiName) queryParams.append('apiName', params.apiName);
      if (params?.collectionId) queryParams.append('collectionId', params.collectionId);

      const response = await api.get(`/api/tasks/availability/trend?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch availability trend',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: 'An unexpected error occurred while fetching availability trend',
      } as DashboardError;
    }
  },

  // Get reports
  getReports: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    format?: string;
  }): Promise<{
    reports: ReportData[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.format) queryParams.append('format', params.format);

      const response = await api.get(`/api/tasks/reports?${queryParams.toString()}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch reports',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: 'An unexpected error occurred while fetching reports',
      } as DashboardError;
    }
  },

  // Get task statistics
  getTaskStats: async (): Promise<{
    totalJobs: number;
    waitingJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    delayedJobs: number;
  }> => {
    try {
      const response = await api.get('/api/tasks/stats');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch task statistics',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as DashboardError;
      }
      throw {
        message: 'An unexpected error occurred while fetching task statistics',
      } as DashboardError;
    }
  },
};

export default dashboardApi;