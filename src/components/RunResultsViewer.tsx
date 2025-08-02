import React, { useEffect, useState } from 'react';
import { useLogsStore } from '../stores/logsStore';
import type { RunDetails } from '../api/logsApi';
import LoadingSpinner from './LoadingSpinner';
import APILogs from './APILogs';

interface RunResultsViewerProps {
  runId?: string;
  collectionId?: string;
  className?: string;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'RUNNING':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'FAILED':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'PENDING':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'RUNNING':
      return (
        <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'FAILED':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'PENDING':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const formatDuration = (startTime: string, endTime?: string | null): string => {
  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = end.getTime() - start.getTime();
    
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    if (duration < 3600000) return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
    return `${Math.floor(duration / 3600000)}h ${Math.floor((duration % 3600000) / 60000)}m`;
  } catch {
    return 'N/A';
  }
};

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const RunOverview: React.FC<{ run: RunDetails }> = ({ run }) => {
  const statusColor = getStatusColor(run.status);
  const successRate = run.totalRequests > 0 ? (run.passedRequests / run.totalRequests) * 100 : 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(run.status)}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{run.collection.name}</h2>
            <p className="text-sm text-gray-500">
              Run ID: <span className="font-mono">{run.id}</span>
            </p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
          {run.status}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{run.totalRequests}</div>
          <div className="text-sm text-gray-500">Total Requests</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{run.passedRequests}</div>
          <div className="text-sm text-gray-500">Passed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{run.failedRequests}</div>
          <div className="text-sm text-gray-500">Failed</div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${
            successRate >= 99 ? 'text-green-600' :
            successRate >= 90 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Configuration</label>
            <p className="text-sm text-gray-900">{run.configName}</p>
          </div>
          
          {run.variableSetName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variable Set</label>
              <p className="text-sm text-gray-900">{run.variableSetName}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <p className="text-sm text-gray-900">{formatTimestamp(run.startTime)}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {run.endTime && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <p className="text-sm text-gray-900">{formatTimestamp(run.endTime)}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <p className="text-sm text-gray-900">
              {formatDuration(run.startTime, run.endTime)}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Time</label>
            <p className="text-sm text-gray-900">
              {run.totalTime ? `${run.totalTime.toFixed(0)}ms` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
      
      {run.errorMessage && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Error Message</h4>
          <p className="text-sm text-red-700">{run.errorMessage}</p>
        </div>
      )}
      
      {run.collection.description && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Collection Description</h4>
          <p className="text-sm text-gray-700">{run.collection.description}</p>
        </div>
      )}
    </div>
  );
};

const RecentRunsList: React.FC<{ collectionId?: string; currentRunId?: string }> = ({ 
  collectionId, 
  currentRunId 
}) => {
  const { recentRuns, loading, fetchRecentRuns, setCurrentRun } = useLogsStore();
  
  useEffect(() => {
    fetchRecentRuns(collectionId, 5);
  }, [collectionId, fetchRecentRuns]);
  
  if (loading.recentRuns) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <LoadingSpinner size="sm" message="Loading recent runs..." />
      </div>
    );
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Runs</h3>
      
      {recentRuns.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No recent runs available</p>
      ) : (
        <div className="space-y-2">
          {recentRuns.map((run) => (
            <div
              key={run.id}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                run.id === currentRunId
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setCurrentRun(run)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    run.status === 'COMPLETED' ? 'bg-green-400' :
                    run.status === 'RUNNING' ? 'bg-blue-400' :
                    run.status === 'FAILED' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {run.collection.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(run.startTime)}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{run.passedRequests}/{run.totalRequests} passed</span>
                <span>{formatDuration(run.startTime, run.endTime)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RunResultsViewer: React.FC<RunResultsViewerProps> = ({ 
  runId, 
  collectionId, 
  className = '' 
}) => {
  const {
    currentRun,
    loading,
    error,
    fetchRunDetails,
    setCurrentRun,
  } = useLogsStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'logs'>('overview');
  
  useEffect(() => {
    if (runId) {
      fetchRunDetails(runId);
    } else {
      setCurrentRun(null);
    }
  }, [runId, fetchRunDetails, setCurrentRun]);
  
  if (loading.runDetails) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" message="Loading run details..." />
      </div>
    );
  }
  
  if (error.runDetails) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load run details</h3>
            <p className="text-sm text-red-700 mt-1">{error.runDetails.message}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!runId && !currentRun) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <RecentRunsList collectionId={collectionId} />
          </div>
          
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No run selected</h3>
              <p className="text-gray-500">Select a run from the list to view detailed results and logs.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const displayRun = currentRun || (runId ? null : currentRun);
  
  if (!displayRun) {
    return null;
  }
  
  return (
    <div className={className}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <RecentRunsList 
            collectionId={collectionId || displayRun.collectionId} 
            currentRunId={displayRun.id}
          />
        </div>
        
        <div className="lg:col-span-3">
          <div className="flex border-b border-gray-200 mb-6">
            {['overview', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'logs' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-xs rounded-full">
                    {displayRun.apiResults.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {activeTab === 'overview' && <RunOverview run={displayRun} />}
          {activeTab === 'logs' && <APILogs runId={displayRun.id} />}
        </div>
      </div>
    </div>
  );
};

export default RunResultsViewer;