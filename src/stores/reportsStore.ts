import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  reportsApi,
  type ReportData,
  type ReportGenerationRequest,
  type ReportsError,
} from '../api/reportsApi';

interface DownloadProgress {
  reportId: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

interface ReportsState {
  // Reports Data
  reports: ReportData[];
  currentReport: ReportData | null;
  total: number;
  page: number;
  totalPages: number;
  
  // Statistics
  reportStats: {
    totalReports: number;
    reportsByType: Record<string, number>;
    reportsByFormat: Record<string, number>;
    recentActivity: {
      reportId: string;
      type: string;
      format: string;
      createdAt: string;
    }[];
  } | null;
  
  // Download Management
  downloads: Map<string, DownloadProgress>;
  
  // UI State
  loading: {
    reports: boolean;
    reportStats: boolean;
    generating: boolean;
    downloading: boolean;
    deleting: boolean;
  };
  
  error: {
    reports: ReportsError | null;
    reportStats: ReportsError | null;
    generating: ReportsError | null;
    downloading: ReportsError | null;
    deleting: ReportsError | null;
  };
  
  // Filters
  filters: {
    type: string | null;
    format: string | null;
    collectionId: string | null;
    dateRange: {
      startDate: string | null;
      endDate: string | null;
    };
  };
  
  // Actions
  fetchReports: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    format?: string;
    collectionId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  
  fetchReport: (reportId: string) => Promise<void>;
  fetchReportStats: () => Promise<void>;
  
  downloadReport: (reportId: string, filename?: string) => Promise<void>;
  generateReport: (request: ReportGenerationRequest) => Promise<void>;
  generateMultiFormatReport: (request: Omit<ReportGenerationRequest, 'format'>) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  previewReport: (reportId: string) => Promise<{ content: string; format: string } | null>;
  
  // Filter Actions
  setFilters: (filters: Partial<ReportsState['filters']>) => void;
  clearFilters: () => void;
  
  // Download Management
  getDownloadProgress: (reportId: string) => DownloadProgress | null;
  clearDownload: (reportId: string) => void;
  clearAllDownloads: () => void;
  
  // UI Actions
  setCurrentReport: (report: ReportData | null) => void;
  clearError: (errorType: keyof ReportsState['error']) => void;
  clearAllErrors: () => void;
  
  // Utility Actions
  refreshData: () => Promise<void>;
}

// Utility function to trigger file download
const triggerDownload = (blob: Blob, filename: string, format: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Determine file extension based on format
  const extension = format.toLowerCase() === 'pdf' ? '.pdf' : '.html';
  link.download = filename.endsWith(extension) ? filename : `${filename}${extension}`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const useReportsStore = create<ReportsState>()(
  devtools(
    (set, get) => ({
      // Initial State
      reports: [],
      currentReport: null,
      total: 0,
      page: 1,
      totalPages: 0,
      
      reportStats: null,
      downloads: new Map(),
      
      loading: {
        reports: false,
        reportStats: false,
        generating: false,
        downloading: false,
        deleting: false,
      },
      
      error: {
        reports: null,
        reportStats: null,
        generating: null,
        downloading: null,
        deleting: null,
      },
      
      filters: {
        type: null,
        format: null,
        collectionId: null,
        dateRange: {
          startDate: null,
          endDate: null,
        },
      },
      
      // Actions
      fetchReports: async (params) => {
        set((state) => ({
          loading: { ...state.loading, reports: true },
          error: { ...state.error, reports: null },
        }));
        
        try {
          const { filters } = get();
          const mergedParams = {
            ...params,
            type: params?.type || filters.type || undefined,
            format: params?.format || filters.format || undefined,
            collectionId: params?.collectionId || filters.collectionId || undefined,
            startDate: params?.startDate || filters.dateRange.startDate || undefined,
            endDate: params?.endDate || filters.dateRange.endDate || undefined,
          };
          
          const reportsData = await reportsApi.getReports(mergedParams);
          set((state) => ({
            reports: reportsData.reports,
            total: reportsData.total,
            page: reportsData.page,
            totalPages: reportsData.totalPages,
            loading: { ...state.loading, reports: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, reports: false },
            error: { ...state.error, reports: error as ReportsError },
          }));
        }
      },
      
      fetchReport: async (reportId: string) => {
        try {
          const report = await reportsApi.getReport(reportId);
          set(() => ({
            currentReport: report,
          }));
        } catch (error) {
          console.error('Failed to fetch report:', error);
        }
      },
      
      fetchReportStats: async () => {
        set((state) => ({
          loading: { ...state.loading, reportStats: true },
          error: { ...state.error, reportStats: null },
        }));
        
        try {
          const stats = await reportsApi.getReportStats();
          set((state) => ({
            reportStats: stats,
            loading: { ...state.loading, reportStats: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, reportStats: false },
            error: { ...state.error, reportStats: error as ReportsError },
          }));
        }
      },
      
      downloadReport: async (reportId: string, filename) => {
        const { downloads } = get();
        
        // Set initial download progress
        const newDownloads = new Map(downloads);
        newDownloads.set(reportId, {
          reportId,
          progress: 0,
          status: 'downloading',
        });
        
        set((state) => ({
          downloads: newDownloads,
          loading: { ...state.loading, downloading: true },
          error: { ...state.error, downloading: null },
        }));
        
        try {
          // Find the report to get its format and type
          const report = get().reports.find(r => r.id === reportId) || get().currentReport;
          if (!report) {
            throw new Error('Report not found');
          }
          
          const blob = await reportsApi.downloadReport(reportId);
          
          // Generate filename if not provided
          const defaultFilename = filename || 
            `${report.reportType}-Report-${report.reportDate}-${report.id.slice(0, 8)}`;
          
          // Trigger download
          triggerDownload(blob, defaultFilename, report.format);
          
          // Update download progress to completed
          const updatedDownloads = new Map(get().downloads);
          updatedDownloads.set(reportId, {
            reportId,
            progress: 100,
            status: 'completed',
          });
          
          set((state) => ({
            downloads: updatedDownloads,
            loading: { ...state.loading, downloading: false },
          }));
          
          // Clear download after 3 seconds
          setTimeout(() => {
            const currentDownloads = new Map(get().downloads);
            currentDownloads.delete(reportId);
            set({ downloads: currentDownloads });
          }, 3000);
          
        } catch (error) {
          const errorDownloads = new Map(get().downloads);
          errorDownloads.set(reportId, {
            reportId,
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Download failed',
          });
          
          set((state) => ({
            downloads: errorDownloads,
            loading: { ...state.loading, downloading: false },
            error: { ...state.error, downloading: error as ReportsError },
          }));
        }
      },
      
      generateReport: async (request: ReportGenerationRequest) => {
        set((state) => ({
          loading: { ...state.loading, generating: true },
          error: { ...state.error, generating: null },
        }));
        
        try {
          const result = await reportsApi.generateReport(request);
          set((state) => ({
            loading: { ...state.loading, generating: false },
          }));
          
          // Refresh reports list after generation
          if (result.success) {
            await get().fetchReports();
          }
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, generating: false },
            error: { ...state.error, generating: error as ReportsError },
          }));
        }
      },
      
      generateMultiFormatReport: async (request) => {
        set((state) => ({
          loading: { ...state.loading, generating: true },
          error: { ...state.error, generating: null },
        }));
        
        try {
          const result = await reportsApi.generateMultiFormatReport(request);
          set((state) => ({
            loading: { ...state.loading, generating: false },
          }));
          
          // Refresh reports list after generation
          if (result.success) {
            await get().fetchReports();
          }
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, generating: false },
            error: { ...state.error, generating: error as ReportsError },
          }));
        }
      },
      
      deleteReport: async (reportId: string) => {
        set((state) => ({
          loading: { ...state.loading, deleting: true },
          error: { ...state.error, deleting: null },
        }));
        
        try {
          await reportsApi.deleteReport(reportId);
          
          // Remove from local state
          set((state) => ({
            reports: state.reports.filter(r => r.id !== reportId),
            currentReport: state.currentReport?.id === reportId ? null : state.currentReport,
            loading: { ...state.loading, deleting: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, deleting: false },
            error: { ...state.error, deleting: error as ReportsError },
          }));
        }
      },
      
      previewReport: async (reportId: string) => {
        try {
          return await reportsApi.previewReport(reportId);
        } catch (error) {
          console.error('Failed to preview report:', error);
          return null;
        }
      },
      
      // Filter Actions
      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },
      
      clearFilters: () => {
        set({
          filters: {
            type: null,
            format: null,
            collectionId: null,
            dateRange: {
              startDate: null,
              endDate: null,
            },
          },
        });
      },
      
      // Download Management
      getDownloadProgress: (reportId: string) => {
        return get().downloads.get(reportId) || null;
      },
      
      clearDownload: (reportId: string) => {
        const { downloads } = get();
        const newDownloads = new Map(downloads);
        newDownloads.delete(reportId);
        set({ downloads: newDownloads });
      },
      
      clearAllDownloads: () => {
        set({ downloads: new Map() });
      },
      
      // UI Actions
      setCurrentReport: (report: ReportData | null) => {
        set({ currentReport: report });
      },
      
      clearError: (errorType: keyof ReportsState['error']) => {
        set((state) => ({
          error: { ...state.error, [errorType]: null },
        }));
      },
      
      clearAllErrors: () => {
        set({
          error: {
            reports: null,
            reportStats: null,
            generating: null,
            downloading: null,
            deleting: null,
          },
        });
      },
      
      // Utility Actions
      refreshData: async () => {
        const { fetchReports, fetchReportStats } = get();
        await Promise.allSettled([
          fetchReports(),
          fetchReportStats(),
        ]);
      },
    }),
    {
      name: 'reports-store',
    }
  )
);