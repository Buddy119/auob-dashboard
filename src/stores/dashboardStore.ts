import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  dashboardApi,
  type CollectionConfig,
  type CollectionAvailabilityData,
  type ReportData,
  type DashboardError,
} from '../api/dashboardApi';

interface DashboardState {
  // Collections
  collections: CollectionConfig[];
  selectedCollection: CollectionConfig | null;
  
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
  
  // Actions
  fetchCollections: () => Promise<void>;
  fetchCollection: (name: string) => Promise<void>;
  fetchSystemAvailability: () => Promise<void>;
  fetchCollectionAvailability: (collectionId: string) => Promise<CollectionAvailabilityData | null>;
  fetchReports: (params?: { page?: number; limit?: number; type?: string; format?: string }) => Promise<void>;
  fetchTaskStats: () => Promise<void>;
  
  // UI Actions
  toggleCollectionExpansion: (collectionId: string) => void;
  setSelectedCollection: (collection: CollectionConfig | null) => void;
  clearError: (errorType: keyof DashboardState['error']) => void;
  clearAllErrors: () => void;
  
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
      
      fetchSystemAvailability: async () => {
        set((state) => ({
          loading: { ...state.loading, systemAvailability: true },
          error: { ...state.error, systemAvailability: null },
        }));
        
        try {
          const systemAvailability = await dashboardApi.getSystemAvailability();
          set((state) => ({
            systemAvailability,
            loading: { ...state.loading, systemAvailability: false },
          }));
        } catch (error) {
          set((state) => ({
            loading: { ...state.loading, systemAvailability: false },
            error: { ...state.error, systemAvailability: error as DashboardError },
          }));
        }
      },
      
      fetchCollectionAvailability: async (collectionId: string) => {
        try {
          const collectionAvailability = await dashboardApi.getCollectionAvailability(collectionId);
          
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
        });
      },
      
      // Refresh Actions
      refreshAllData: async () => {
        const { fetchCollections, fetchSystemAvailability, fetchReports, fetchTaskStats } = get();
        
        await Promise.allSettled([
          fetchCollections(),
          fetchSystemAvailability(),
          fetchReports({ page: 1, limit: 10 }),
          fetchTaskStats(),
        ]);
      },
      
      startAutoRefresh: (intervalMs = 30000) => {
        const { stopAutoRefresh, refreshAllData } = get();
        
        // Clear existing interval
        stopAutoRefresh();
        
        const intervalId = setInterval(() => {
          refreshAllData();
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