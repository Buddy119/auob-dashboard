import React, { useEffect } from 'react';
import { useLogsStore } from '../stores/logsStore';
import type { RealtimeAPIStatus } from '../api/logsApi';
import LoadingSpinner from './LoadingSpinner';

interface RealtimeStatusProps {
  collectionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'pending':
      return (
        <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const getMethodColor = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'POST':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PUT':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'PATCH':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return 'Never';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  } catch {
    return timestamp;
  }
};

const formatResponseTime = (responseTime: number | null): string => {
  if (!responseTime) return 'N/A';
  if (responseTime < 1000) return `${responseTime.toFixed(0)}ms`;
  return `${(responseTime / 1000).toFixed(2)}s`;
};

const StatusCard: React.FC<{ status: RealtimeAPIStatus }> = ({ status }) => {
  const statusColor = getStatusColor(status.currentStatus);
  const methodColor = getMethodColor(status.method);
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon(status.currentStatus)}
          <span className={`px-2 py-1 rounded text-xs font-medium border ${methodColor}`}>
            {status.method.toUpperCase()}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {formatTimestamp(status.lastRunTime)}
        </div>
      </div>
      
      <div className="mb-3">
        <h4 className="font-medium text-gray-900 truncate">{status.apiName}</h4>
        <p className="text-sm text-gray-500 font-mono truncate">{status.url}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Availability (24h)</p>
          <p className={`text-sm font-semibold ${
            status.availability24h >= 99 ? 'text-green-600' :
            status.availability24h >= 90 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {status.availability24h.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Response Time</p>
          <p className="text-sm font-semibold text-gray-900">
            {formatResponseTime(status.lastResponseTime)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{status.successRuns24h}/{status.totalRuns24h} success</span>
        {status.lastStatusCode && (
          <span className={`px-1.5 py-0.5 rounded border ${statusColor}`}>
            {status.lastStatusCode}
          </span>
        )}
      </div>
      
      {status.lastError && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {status.lastError}
        </div>
      )}
    </div>
  );
};

const LiveExecutionActivity: React.FC = () => {
  const { liveExecutionStatus, loading, fetchLiveExecutionStatus } = useLogsStore();
  
  useEffect(() => {
    fetchLiveExecutionStatus();
  }, [fetchLiveExecutionStatus]);
  
  if (loading.liveStatus) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <LoadingSpinner size="sm" message="Loading live status..." />
      </div>
    );
  }
  
  if (!liveExecutionStatus) {
    return null;
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Live Execution Status</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{liveExecutionStatus.activeRuns}</div>
          <div className="text-xs text-gray-500">Active Runs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-600">{liveExecutionStatus.pendingRuns}</div>
          <div className="text-xs text-gray-500">Pending Runs</div>
        </div>
      </div>
      
      {liveExecutionStatus.recentActivity.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {liveExecutionStatus.recentActivity.slice(0, 3).map((activity) => (
              <div key={activity.runId} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'COMPLETED' ? 'bg-green-400' :
                    activity.status === 'RUNNING' ? 'bg-blue-400 animate-pulse' :
                    activity.status === 'FAILED' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="truncate max-w-24">{activity.collectionName}</span>
                </div>
                <div className="text-gray-500">
                  {formatTimestamp(activity.startTime)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  collectionId,
  autoRefresh = true,
  refreshInterval = 5000,
  className = ''
}) => {
  const {
    realtimeStatus,
    loading,
    error,
    realtimeEnabled,
    fetchRealtimeStatus,
    startRealtimeUpdates,
    stopRealtimeUpdates,
  } = useLogsStore();
  
  useEffect(() => {
    // Initial fetch
    fetchRealtimeStatus(collectionId);
    
    // Setup auto-refresh if enabled
    if (autoRefresh) {
      startRealtimeUpdates(refreshInterval);
    }
    
    // Cleanup on unmount
    return () => {
      if (autoRefresh) {
        stopRealtimeUpdates();
      }
    };
  }, [collectionId, autoRefresh, refreshInterval, fetchRealtimeStatus, startRealtimeUpdates, stopRealtimeUpdates]);
  
  const handleManualRefresh = () => {
    fetchRealtimeStatus(collectionId);
  };
  
  if (loading.realtimeStatus && realtimeStatus.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" message="Loading real-time status..." />
      </div>
    );
  }
  
  if (error.realtimeStatus) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load real-time status</h3>
            <p className="text-sm text-red-700 mt-1">{error.realtimeStatus.message}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Real-time API Status</h2>
          <p className="text-sm text-gray-600">
            {realtimeStatus.length} API{realtimeStatus.length !== 1 ? 's' : ''} monitored
            {realtimeEnabled && (
              <span className="ml-2 inline-flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                Live updates enabled
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={loading.realtimeStatus}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg 
              className={`w-3 h-3 mr-1 ${loading.realtimeStatus ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <LiveExecutionActivity />
        
        <div className="lg:col-span-3">
          {realtimeStatus.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No API status available</h3>
              <p className="text-gray-500">Run some collections to see real-time API status here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {realtimeStatus.map((status) => (
                <StatusCard
                  key={`${status.method}-${status.url}`}
                  status={status}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeStatus;