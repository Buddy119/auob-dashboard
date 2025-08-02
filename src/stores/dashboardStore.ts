import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  dashboardApi,
  type CollectionConfig,
  type CollectionAvailabilityData,
  type ReportData,
  type DashboardError,
} from '../api/dashboardApi';
import { collectionApi } from '../api/collectionApi';

interface DashboardState {
  // Collections
  collections: CollectionConfig[];
  selectedCollection: CollectionConfig | null;
  
  // Uploaded Postman Collections
  uploadedCollections: any[];
  uploadedCollectionsLoading: boolean;
  uploadedCollectionsError: DashboardError | null;
  
  // Availability Data
  systemAvailability: {
    overallAvailability: number;
    totalAPIs: number;
    collections: CollectionAvailabilityData[];
  } | null;
  
  // Reports
  reports: ReportData[];
  reportsTotal: number;
  reportsPage: number;
  reportsTotalPages: number;
  
  // Task Statistics
  taskStats: {
    totalJobs: number;
    waitingJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    delayedJobs: number;
  } | null;
  
  // UI State
  loading: {
    collections: boolean;
    systemAvailability: boolean;
    reports: boolean;
    taskStats: boolean;
  };
  
  error: {
    collections: DashboardError | null;
    systemAvailability: DashboardError | null;
    reports: DashboardError | null;
    taskStats: DashboardError | null;
  };
  
  expandedCollections: Set<string>;
  refreshInterval: NodeJS.Timeout | null;
  refreshFailureCount: number;
  lastSuccessfulRefresh: Date | null;
  
  // Actions
  fetchCollections: () => Promise<void>;
  fetchCollection: (name: string) => Promise<void>;
  fetchUploadedCollections: () => Promise<void>;
  fetchSystemAvailability: (dateRange?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchCollectionAvailability: (collectionId: string, dateRange?: { startDate?: string; endDate?: string }) => Promise<CollectionAvailabilityData | null>;
  fetchReports: (params?: { page?: number; limit?: number; type?: string; format?: string }) => Promise<void>;
  fetchTaskStats: () => Promise<void>;
  
  // UI Actions
  toggleCollectionExpansion: (collectionId: string) => void;
  setSelectedCollection: (collection: CollectionConfig | null) => void;
  clearError: (errorType: keyof DashboardState['error']) => void;
  clearAllErrors: () => void;
  clearUploadedCollectionsError: () => void;
  
  // Refresh Actions
  refreshAllData: () => Promise<void>;
  startAutoRefresh: (intervalMs?: number) => void;
  stopAutoRefresh: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Initial State
      collections: [],
      selectedCollection: null,
      uploadedCollections: [],
      uploadedCollectionsLoading: false,
      uploadedCollectionsError: null,
      systemAvailability: null,
      reports: [],
      reportsTotal: 0,
      reportsPage: 1,
      reportsTotalPages: 0,
      taskStats: null,
      
      loading: {
        collections: false,
        systemAvailability: false,
        reports: false,
        taskStats: false,
      },
      
      error: {
        collections: null,
        systemAvailability: null,
        reports: null,
        taskStats: null,
      },
      
      expandedCollections: new Set(),
      refreshInterval: null,
      refreshFailureCount: 0,
      lastSuccessfulRefresh: null,
      
      // Actions
      fetchCollections: async () => {
        set((state) => ({
          loading: { ...state.loading, collections: true },
          error: { ...state.error, collections: null },
        }));
        
        try {
          const collections = await dashboardApi.getCollections();
          set((state) => ({
            collections,
            loading: { ...state.loading, collections: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, collections: false },
            error: { ...state.error, collections: error as DashboardError },
          }));
        }
      },
      
      fetchCollection: async (name: string) => {
        try {
          const collection = await dashboardApi.getCollection(name);
          set(() => ({
            selectedCollection: collection,
          }));
        } catch (error) {
          console.error('Failed to fetch collection:', error);
        }
      },
      
      fetchUploadedCollections: async () => {
        set(() => ({
          uploadedCollectionsLoading: true,
          uploadedCollectionsError: null,
        }));
        
        try {
          const response = await collectionApi.getCollections();
          const collections = Array.isArray(response) ? response : (response as any)?.data || [];
          
          // Validate that we received valid data before updating state
          if (Array.isArray(collections) && collections.length >= 0) {
            console.log(`✅ Fetched ${collections.length} collections successfully`);
            set(() => ({
              uploadedCollections: collections,
              uploadedCollectionsLoading: false,
            }));
          } else {
            console.warn('⚠️ Empty or invalid collections data received, retaining existing data');
            set(() => ({
              uploadedCollectionsLoading: false,
              uploadedCollectionsError: {
                message: 'Invalid response format received from server',
                status: 200,
                details: 'Response was not in expected array format'
              } as DashboardError,
            }));
          }
        } catch (error) {
          console.error('❌ Failed to fetch uploaded collections:', error);
          
          // Don't clear existing collections on error - preserve them
          set(() => ({
            uploadedCollectionsLoading: false,
            uploadedCollectionsError: {
              message: error instanceof Error ? error.message : 'Failed to fetch collections',
              status: (error as any)?.status || 500,
              details: 'Network or server error occurred while fetching collections'
            } as DashboardError,
            // Keep existing uploadedCollections - don't clear them
          }));
        }
      },
      
      fetchSystemAvailability: async (dateRange?: { startDate?: string; endDate?: string }) => {
        set((state) => ({
          loading: { ...state.loading, systemAvailability: true },
          error: { ...state.error, systemAvailability: null },
        }));
        
        try {
          const systemAvailability = await dashboardApi.getSystemAvailability(dateRange);
          set((state) => ({
            systemAvailability,
            loading: { ...state.loading, systemAvailability: false },
          }));
        } catch (error) {
          console.error('Failed to fetch system availability:', error);
          set((state) => ({
            loading: { ...state.loading, systemAvailability: false },
            error: { ...state.error, systemAvailability: error as DashboardError },
          }));
        }
      },
      
      fetchCollectionAvailability: async (collectionId: string, dateRange?: { startDate?: string; endDate?: string }) => {
        try {
          const collectionAvailability = await dashboardApi.getCollectionAvailability(collectionId, dateRange);
          
          // Update the system availability collections array with new data
          set((state) => {
            if (!state.systemAvailability) return state;
            
            const updatedCollections = state.systemAvailability.collections.map((collection) =>
              collection.collectionId === collectionId ? collectionAvailability : collection
            );
            
            // If collection not found, add it
            if (!updatedCollections.find((c) => c.collectionId === collectionId)) {
              updatedCollections.push(collectionAvailability);
            }
            
            return {
              systemAvailability: {
                ...state.systemAvailability,
                collections: updatedCollections,
              },
            };
          });
          
          return collectionAvailability;
        } catch (error) {
          console.error('Failed to fetch collection availability:', error);
          return null;
        }
      },
      
      fetchReports: async (params) => {
        set((state) => ({
          loading: { ...state.loading, reports: true },
          error: { ...state.error, reports: null },
        }));
        
        try {
          const reportsData = await dashboardApi.getReports(params);
          set((state) => ({
            reports: reportsData.reports,
            reportsTotal: reportsData.total,
            reportsPage: reportsData.page,
            reportsTotalPages: reportsData.totalPages,
            loading: { ...state.loading, reports: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, reports: false },
            error: { ...state.error, reports: error as DashboardError },
          }));
        }
      },
      
      fetchTaskStats: async () => {
        set((state) => ({
          loading: { ...state.loading, taskStats: true },
          error: { ...state.error, taskStats: null },
        }));
        
        try {
          const taskStats = await dashboardApi.getTaskStats();
          set((state) => ({
            taskStats,
            loading: { ...state.loading, taskStats: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, taskStats: false },
            error: { ...state.error, taskStats: error as DashboardError },
          }));
        }
      },
      
      // UI Actions
      toggleCollectionExpansion: (collectionId: string) => {
        set((state) => {
          const newExpandedCollections = new Set(state.expandedCollections);
          if (newExpandedCollections.has(collectionId)) {
            newExpandedCollections.delete(collectionId);
          } else {
            newExpandedCollections.add(collectionId);
          }
          return { expandedCollections: newExpandedCollections };
        });
      },
      
      setSelectedCollection: (collection: CollectionConfig | null) => {
        set({ selectedCollection: collection });
      },
      
      clearError: (errorType: keyof DashboardState['error']) => {
        set((state) => ({
          error: { ...state.error, [errorType]: null },
        }));
      },
      
      clearAllErrors: () => {
        set({
          error: {
            collections: null,
            systemAvailability: null,
            reports: null,
            taskStats: null,
          },
          uploadedCollectionsError: null,
        });
      },
      
      clearUploadedCollectionsError: () => {
        set({
          uploadedCollectionsError: null,
        });
      },
      
      // Refresh Actions
      refreshAllData: async () => {
        const { fetchCollections, fetchUploadedCollections, fetchSystemAvailability, fetchReports, fetchTaskStats } = get();
        
        console.log('🔄 Starting dashboard refresh...');
        const startTime = Date.now();
        
        const results = await Promise.allSettled([
          fetchCollections(),
          fetchUploadedCollections(),
          fetchSystemAvailability(),
          fetchReports({ page: 1, limit: 10 }),
          fetchTaskStats(),
        ]);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log results for debugging
        const refreshResults = {
          collections: results[0].status,
          uploadedCollections: results[1].status,
          systemAvailability: results[2].status,
          reports: results[3].status,
          taskStats: results[4].status,
        };
        
        console.log(`✅ Dashboard refresh completed in ${duration}ms:`, refreshResults);
        
        // Count failures and update refresh tracking
        const failures = results.filter(result => result.status === 'rejected').length;
        
        if (failures === 0) {
          // Successful refresh - reset failure count
          set(() => ({
            refreshFailureCount: 0,
            lastSuccessfulRefresh: new Date(),
          }));
        } else {
          console.warn(`⚠️ ${failures} out of ${results.length} refresh operations failed`);
          set((state) => ({
            refreshFailureCount: state.refreshFailureCount + 1,
          }));
        }
      },
      
      startAutoRefresh: (intervalMs = 30000) => {
        const { stopAutoRefresh, refreshAllData } = get();
        
        // Clear existing interval
        stopAutoRefresh();
        
        const intervalId = setInterval(async () => {
          const currentState = get();
          
          // Implement exponential backoff on repeated failures
          const backoffMultiplier = Math.min(Math.pow(2, currentState.refreshFailureCount), 8); // Max 8x delay
          const effectiveInterval = intervalMs * backoffMultiplier;
          
          if (currentState.refreshFailureCount > 0) {
            console.log(`⏳ Refresh delayed due to ${currentState.refreshFailureCount} failures. Next refresh in ${effectiveInterval/1000}s`);
            
            // Only proceed if enough time has passed since last failure
            if (currentState.lastSuccessfulRefresh) {
              const timeSinceLastSuccess = Date.now() - currentState.lastSuccessfulRefresh.getTime();
              if (timeSinceLastSuccess < effectiveInterval) {
                return; // Skip this refresh cycle
              }
            }
          }
          
          await refreshAllData();
        }, intervalMs) as NodeJS.Timeout;
        
        set({ refreshInterval: intervalId });
      },
      
      stopAutoRefresh: () => {
        const { refreshInterval } = get();
        if (refreshInterval) {
          clearInterval(refreshInterval);
          set({ refreshInterval: null });
        }
      },
    }),
    {
      name: 'dashboard-store',
    }
  )
);