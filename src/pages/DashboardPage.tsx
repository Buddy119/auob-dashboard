import React, { useEffect } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import CollectionCard from '../components/CollectionCard';

const DashboardPage: React.FC = () => {
  const {
    systemAvailability,
    taskStats,
    reports,
    loading,
    error,
    refreshAllData,
    startAutoRefresh,
    stopAutoRefresh,
    clearError,
  } = useDashboardStore();

  useEffect(() => {
    // Initial data fetch
    refreshAllData();
    
    // Start auto-refresh every 30 seconds
    startAutoRefresh(30000);
    
    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, [refreshAllData, startAutoRefresh, stopAutoRefresh]);

  const handleRefresh = () => {
    refreshAllData();
  };

  const getOverallSystemStatus = () => {
    if (!systemAvailability) return { status: 'unknown', color: 'gray' };
    
    const availability = systemAvailability.overallAvailability;
    if (availability >= 99) return { status: 'excellent', color: 'green' };
    if (availability >= 95) return { status: 'good', color: 'green' };
    if (availability >= 90) return { status: 'fair', color: 'yellow' };
    return { status: 'poor', color: 'red' };
  };

  const systemStatus = getOverallSystemStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">AUOB Health Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loading.systemAvailability}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${loading.systemAvailability ? 'animate-spin' : ''}`} 
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Overall Availability */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 bg-${systemStatus.color}-100 rounded-full flex items-center justify-center`}>
                    <div className={`w-3 h-3 bg-${systemStatus.color}-500 rounded-full`} />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">System Availability</p>
                  <p className={`text-2xl font-semibold text-${systemStatus.color}-600`}>
                    {loading.systemAvailability ? '...' : 
                     systemAvailability ? `${systemAvailability.overallAvailability.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Total APIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total APIs</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading.systemAvailability ? '...' : 
                     systemAvailability ? systemAvailability.totalAPIs : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Jobs */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading.taskStats ? '...' : 
                     taskStats ? taskStats.activeJobs : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Reports Generated</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading.reports ? '...' : reports.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {(error.systemAvailability || error.collections || error.taskStats || error.reports) && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    There were some errors loading dashboard data
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc space-y-1 pl-5">
                      {error.systemAvailability && <li>System availability: {error.systemAvailability.message}</li>}
                      {error.collections && <li>Collections: {error.collections.message}</li>}
                      {error.taskStats && <li>Task statistics: {error.taskStats.message}</li>}
                      {error.reports && <li>Reports: {error.reports.message}</li>}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        clearError('systemAvailability');
                        clearError('collections');
                        clearError('taskStats');
                        clearError('reports');
                      }}
                      className="text-sm text-red-800 hover:text-red-600 font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collections */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Collections</h2>
            <p className="text-sm text-gray-500">
              {systemAvailability ? `${systemAvailability.collections.length} collections` : 'Loading...'}
            </p>
          </div>

          {loading.systemAvailability ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : systemAvailability && systemAvailability.collections.length > 0 ? (
            <div className="space-y-6">
              {systemAvailability.collections.map((collection) => (
                <CollectionCard 
                  key={collection.collectionId} 
                  collection={collection} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-3V8M8 10h8m-4 6h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Collections Found</h3>
              <p className="text-gray-500 mb-4">Upload a Postman collection to get started monitoring your APIs.</p>
              <button
                onClick={() => window.location.href = '/upload'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;