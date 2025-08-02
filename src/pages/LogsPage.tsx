import React, { useState } from 'react';
import { useLogsStore } from '../stores/logsStore';
import RealtimeStatus from '../components/RealtimeStatus';
import RunResultsViewer from '../components/RunResultsViewer';
import APILogs from '../components/APILogs';

const LogsPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'realtime' | 'runs' | 'logs'>('realtime');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  
  const { filters, setFilters, clearFilters } = useLogsStore();

  const handleCollectionFilter = (collectionId: string | null) => {
    setSelectedCollectionId(collectionId);
    setFilters({ collectionId });
  };

  const handleClearFilters = () => {
    setSelectedCollectionId(null);
    setSelectedRunId(null);
    clearFilters();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">API Monitoring & Logs</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {(selectedCollectionId || selectedRunId || Object.values(filters).some(Boolean)) && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 w-fit">
          {[
            { key: 'realtime', label: 'Real-time Status', icon: '📊' },
            { key: 'runs', label: 'Run Results', icon: '📋' },
            { key: 'logs', label: 'API Logs', icon: '📄' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Collection:</label>
              <select
                value={selectedCollectionId || ''}
                onChange={(e) => handleCollectionFilter(e.target.value || null)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Collections</option>
                {/* TODO: Add collection options from dashboard store */}
              </select>
            </div>
            
            {activeView === 'runs' && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Run ID:</label>
                <input
                  type="text"
                  value={selectedRunId || ''}
                  onChange={(e) => setSelectedRunId(e.target.value || null)}
                  placeholder="Enter run ID..."
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ status: e.target.value || null })}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="COMPLETED">Completed</option>
                <option value="RUNNING">Running</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Method:</label>
              <select
                value={filters.method || ''}
                onChange={(e) => setFilters({ method: e.target.value || null })}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Methods</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeView === 'realtime' && (
            <div>
              <RealtimeStatus 
                collectionId={selectedCollectionId || undefined}
                autoRefresh={true}
                refreshInterval={5000}
              />
            </div>
          )}
          
          {activeView === 'runs' && (
            <div>
              <RunResultsViewer 
                runId={selectedRunId || undefined}
                collectionId={selectedCollectionId || undefined}
              />
            </div>
          )}
          
          {activeView === 'logs' && (
            <div>
              <APILogs 
                collectionId={selectedCollectionId || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;