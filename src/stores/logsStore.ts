import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  logsApi,
  type APIRunResult,
  type RunDetails,
  type RealtimeAPIStatus,
  type LogsError,
} from '../api/logsApi';

interface LogsState {
  // Run Details
  currentRun: RunDetails | null;
  recentRuns: RunDetails[];
  allRuns: RunDetails[];
  runsTotal: number;
  runsPage: number;
  runsTotalPages: number;
  
  // API Results
  currentAPIResult: APIRunResult | null;
  apiResults: APIRunResult[];
  apiResultsTotal: number;
  apiResultsPage: number;
  apiResultsTotalPages: number;
  
  // Real-time Status
  realtimeStatus: RealtimeAPIStatus[];
  liveExecutionStatus: {
    activeRuns: number;
    pendingRuns: number;
    recentActivity: {
      runId: string;
      collectionName: string;
      status: string;
      startTime: string;
      progress?: number;
    }[];
  } | null;
  
  // UI State
  loading: {
    runDetails: boolean;
    recentRuns: boolean;
    allRuns: boolean;
    apiResults: boolean;
    realtimeStatus: boolean;
    liveStatus: boolean;
  };
  
  error: {
    runDetails: LogsError | null;
    recentRuns: LogsError | null;
    allRuns: LogsError | null;
    apiResults: LogsError | null;
    realtimeStatus: LogsError | null;
    liveStatus: LogsError | null;
  };
  
  // Filters and Settings
  filters: {
    collectionId: string | null;
    status: string | null;
    method: string | null;
    success: boolean | null;
    dateRange: {
      startDate: string | null;
      endDate: string | null;
    };
  };
  
  // Real-time polling
  realtimeInterval: NodeJS.Timeout | null;
  realtimeEnabled: boolean;
  
  // Actions
  fetchRunDetails: (runId: string) => Promise<void>;
  fetchAPIRunResult: (resultId: string) => Promise<void>;
  fetchRecentRuns: (collectionId?: string, limit?: number) => Promise<void>;
  fetchAllRuns: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    collectionId?: string;
  }) => Promise<void>;
  fetchAPIResults: (params?: {
    runId?: string;
    collectionId?: string;
    success?: boolean;
    method?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  fetchRealtimeStatus: (collectionId?: string) => Promise<void>;
  fetchLiveExecutionStatus: () => Promise<void>;
  
  // Filter Actions
  setFilters: (filters: Partial<LogsState['filters']>) => void;
  clearFilters: () => void;
  
  // Real-time Actions
  startRealtimeUpdates: (intervalMs?: number) => void;
  stopRealtimeUpdates: () => void;
  
  // UI Actions
  setCurrentRun: (run: RunDetails | null) => void;
  setCurrentAPIResult: (result: APIRunResult | null) => void;
  clearError: (errorType: keyof LogsState['error']) => void;
  clearAllErrors: () => void;
  
  // Utility Actions
  refreshCurrentData: () => Promise<void>;
}

export const useLogsStore = create<LogsState>()(
  devtools(
    (set, get) => ({
      // Initial State
      currentRun: null,
      recentRuns: [],
      allRuns: [],
      runsTotal: 0,
      runsPage: 1,
      runsTotalPages: 0,
      
      currentAPIResult: null,
      apiResults: [],
      apiResultsTotal: 0,
      apiResultsPage: 1,
      apiResultsTotalPages: 0,
      
      realtimeStatus: [],
      liveExecutionStatus: null,
      
      loading: {
        runDetails: false,
        recentRuns: false,
        allRuns: false,
        apiResults: false,
        realtimeStatus: false,
        liveStatus: false,
      },
      
      error: {
        runDetails: null,
        recentRuns: null,
        allRuns: null,
        apiResults: null,
        realtimeStatus: null,
        liveStatus: null,
      },
      
      filters: {
        collectionId: null,
        status: null,
        method: null,
        success: null,
        dateRange: {
          startDate: null,
          endDate: null,
        },
      },
      
      realtimeInterval: null,
      realtimeEnabled: false,
      
      // Actions
      fetchRunDetails: async (runId: string) => {
        set((state) => ({
          loading: { ...state.loading, runDetails: true },
          error: { ...state.error, runDetails: null },
        }));
        
        try {
          const runDetails = await logsApi.getRunDetails(runId);
          set((state) => ({
            currentRun: runDetails,
            loading: { ...state.loading, runDetails: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, runDetails: false },
            error: { ...state.error, runDetails: error as LogsError },
          }));
        }
      },
      
      fetchAPIRunResult: async (resultId: string) => {
        try {
          const result = await logsApi.getAPIRunResult(resultId);
          set(() => ({
            currentAPIResult: result,
          }));
        } catch (error) {
          console.error('Failed to fetch API run result:', error);
        }
      },
      
      fetchRecentRuns: async (collectionId?: string, limit = 10) => {
        set((state) => ({
          loading: { ...state.loading, recentRuns: true },
          error: { ...state.error, recentRuns: null },
        }));
        
        try {
          const runs = await logsApi.getRecentRuns(collectionId || '', limit);
          set((state) => ({
            recentRuns: runs,
            loading: { ...state.loading, recentRuns: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, recentRuns: false },
            error: { ...state.error, recentRuns: error as LogsError },
          }));
        }
      },
      
      fetchAllRuns: async (params) => {
        set((state) => ({
          loading: { ...state.loading, allRuns: true },
          error: { ...state.error, allRuns: null },
        }));
        
        try {
          const runsData = await logsApi.getAllRuns(params);
          set((state) => ({
            allRuns: runsData.runs,
            runsTotal: runsData.total,
            runsPage: runsData.page,
            runsTotalPages: runsData.totalPages,
            loading: { ...state.loading, allRuns: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, allRuns: false },
            error: { ...state.error, allRuns: error as LogsError },
          }));
        }
      },
      
      fetchAPIResults: async (params) => {
        set((state) => ({
          loading: { ...state.loading, apiResults: true },
          error: { ...state.error, apiResults: null },
        }));
        
        try {
          const resultsData = await logsApi.getAPIResults(params);
          set((state) => ({
            apiResults: resultsData.results,
            apiResultsTotal: resultsData.total,
            apiResultsPage: resultsData.page,
            apiResultsTotalPages: resultsData.totalPages,
            loading: { ...state.loading, apiResults: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, apiResults: false },
            error: { ...state.error, apiResults: error as LogsError },
          }));
        }
      },
      
      fetchRealtimeStatus: async (collectionId?: string) => {
        set((state) => ({
          loading: { ...state.loading, realtimeStatus: true },
          error: { ...state.error, realtimeStatus: null },
        }));
        
        try {
          const status = await logsApi.getRealtimeAPIStatus(collectionId);
          set((state) => ({
            realtimeStatus: status,
            loading: { ...state.loading, realtimeStatus: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, realtimeStatus: false },
            error: { ...state.error, realtimeStatus: error as LogsError },
          }));
        }
      },
      
      fetchLiveExecutionStatus: async () => {
        set((state) => ({
          loading: { ...state.loading, liveStatus: true },
          error: { ...state.error, liveStatus: null },
        }));
        
        try {
          const liveStatus = await logsApi.getLiveExecutionStatus();
          set((state) => ({
            liveExecutionStatus: liveStatus,
            loading: { ...state.loading, liveStatus: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, liveStatus: false },
            error: { ...state.error, liveStatus: error as LogsError },
          }));
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
            collectionId: null,
            status: null,
            method: null,
            success: null,
            dateRange: {
              startDate: null,
              endDate: null,
            },
          },
        });
      },
      
      // Real-time Actions
      startRealtimeUpdates: (intervalMs = 5000) => {
        const { stopRealtimeUpdates, fetchRealtimeStatus, fetchLiveExecutionStatus } = get();
        
        // Clear existing interval
        stopRealtimeUpdates();
        
        const intervalId = setInterval(() => {
          Promise.allSettled([
            fetchRealtimeStatus(),
            fetchLiveExecutionStatus(),
          ]);
        }, intervalMs) as NodeJS.Timeout;
        
        set({ 
          realtimeInterval: intervalId,
          realtimeEnabled: true,
        });
      },
      
      stopRealtimeUpdates: () => {
        const { realtimeInterval } = get();
        if (realtimeInterval) {
          clearInterval(realtimeInterval);
          set({ 
            realtimeInterval: null,
            realtimeEnabled: false,
          });
        }
      },
      
      // UI Actions
      setCurrentRun: (run: RunDetails | null) => {
        set({ currentRun: run });
      },
      
      setCurrentAPIResult: (result: APIRunResult | null) => {
        set({ currentAPIResult: result });
      },
      
      clearError: (errorType: keyof LogsState['error']) => {
        set((state) => ({
          error: { ...state.error, [errorType]: null },
        }));
      },
      
      clearAllErrors: () => {
        set({
          error: {
            runDetails: null,
            recentRuns: null,
            allRuns: null,
            apiResults: null,
            realtimeStatus: null,
            liveStatus: null,
          },
        });
      },
      
      // Utility Actions
      refreshCurrentData: async () => {
        const { filters, fetchRealtimeStatus, fetchRecentRuns } = get();
        
        await Promise.allSettled([
          fetchRealtimeStatus(filters.collectionId || undefined),
          fetchRecentRuns(filters.collectionId || undefined, 10),
        ]);
      },
    }),
    {
      name: 'logs-store',
    }
  )
);