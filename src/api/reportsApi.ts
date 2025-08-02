import axios, { type AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ReportSummary {
  totalAPIs: number;
  averageAvailability: number;
  totalRequests: number;
  successfulRequests: number;
  highAvailabilityCount: number;
  lowAvailabilityCount: number;
}

export interface ReportData {
  id: string;
  collectionId: string;
  reportType: 'Daily' | 'Weekly' | 'Monthly';
  reportDate: string;
  reportContent: string;
  format: 'HTML' | 'PDF';
  summary: ReportSummary | null;
  apiCount: number;
  createdAt: string;
  collection?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface ReportsListResponse {
  reports: ReportData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ReportGenerationRequest {
  type: 'Daily' | 'Weekly' | 'Monthly';
  format: 'HTML' | 'PDF';
  startDate?: string;
  endDate?: string;
  collectionId?: string;
}

export interface ReportGenerationResponse {
  success: boolean;
  message: string;
  reportId?: string;
  jobId?: string;
}

export interface ReportsError {
  message: string;
  status?: number;
  details?: string;
}

export const reportsApi = {
  // Get all reports with filtering and pagination
  getReports: async (params?: {
    page?: number;
    limit?: number;
    type?: string;
    format?: string;
    collectionId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReportsListResponse> => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.type) queryParams.append('type', params.type);
      if (params?.format) queryParams.append('format', params.format);
      if (params?.collectionId) queryParams.append('collectionId', params.collectionId);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response: AxiosResponse<ReportsListResponse> = await api.get(
        `/api/tasks/reports?${queryParams.toString()}`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch reports',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching reports',
      } as ReportsError;
    }
  },

  // Get specific report details
  getReport: async (reportId: string): Promise<ReportData> => {
    try {
      const response: AxiosResponse<ReportData> = await api.get(`/api/tasks/reports/${reportId}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to fetch report: ${reportId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: `An unexpected error occurred while fetching report: ${reportId}`,
      } as ReportsError;
    }
  },

  // Download report file
  downloadReport: async (reportId: string): Promise<Blob> => {
    try {
      const response: AxiosResponse<Blob> = await api.get(
        `/api/tasks/reports/download/${reportId}`,
        {
          responseType: 'blob',
          headers: {
            'Accept': 'application/octet-stream, application/pdf, text/html',
          },
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to download report: ${reportId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: `An unexpected error occurred while downloading report: ${reportId}`,
      } as ReportsError;
    }
  },

  // Generate new report
  generateReport: async (request: ReportGenerationRequest): Promise<ReportGenerationResponse> => {
    try {
      const response: AxiosResponse<ReportGenerationResponse> = await api.post(
        '/api/tasks/reports/generate',
        request
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to generate report',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: 'An unexpected error occurred while generating report',
      } as ReportsError;
    }
  },

  // Generate multiple format reports
  generateMultiFormatReport: async (request: Omit<ReportGenerationRequest, 'format'>): Promise<ReportGenerationResponse> => {
    try {
      const response: AxiosResponse<ReportGenerationResponse> = await api.post(
        '/api/tasks/reports/multi-format',
        request
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to generate multi-format report',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: 'An unexpected error occurred while generating multi-format report',
      } as ReportsError;
    }
  },

  // Get report generation statistics
  getReportStats: async (): Promise<{
    totalReports: number;
    reportsByType: Record<string, number>;
    reportsByFormat: Record<string, number>;
    recentActivity: {
      reportId: string;
      type: string;
      format: string;
      createdAt: string;
    }[];
  }> => {
    try {
      const response = await api.get('/api/tasks/reports/stats');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch report statistics',
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: 'An unexpected error occurred while fetching report statistics',
      } as ReportsError;
    }
  },

  // Delete report
  deleteReport: async (reportId: string): Promise<void> => {
    try {
      await api.delete(`/api/tasks/reports/${reportId}`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to delete report: ${reportId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: `An unexpected error occurred while deleting report: ${reportId}`,
      } as ReportsError;
    }
  },

  // Preview report content
  previewReport: async (reportId: string): Promise<{ content: string; format: string }> => {
    try {
      const response = await api.get(`/api/tasks/reports/${reportId}/preview`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || `Failed to preview report: ${reportId}`,
          status: error.response?.status,
          details: error.response?.data?.details,
        } as ReportsError;
      }
      throw {
        message: `An unexpected error occurred while previewing report: ${reportId}`,
      } as ReportsError;
    }
  },
};

export default reportsApi;