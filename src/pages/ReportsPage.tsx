import React, { useEffect, useState } from 'react';
import { useReportsStore } from '../stores/reportsStore';
import ReportsList from '../components/ReportsList';
import ReportGenerator from '../components/ReportGenerator';
import LoadingSpinner from '../components/LoadingSpinner';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'generate' | 'stats'>('list');
  
  const {
    reportStats,
    loading,
    error,
    refreshData,
    clearAllErrors,
  } = useReportsStore();

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleRefresh = () => {
    refreshData();
  };

  const ReportStatsCard = () => {
    if (loading.reportStats) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <LoadingSpinner size="sm" message="Loading statistics..." />
        </div>
      );
    }

    if (error.reportStats) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to load statistics</h3>
              <p className="text-sm text-red-700 mt-1">{error.reportStats.message}</p>
            </div>
          </div>
        </div>
      );
    }

    if (!reportStats) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-500">No statistics available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Report Statistics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reportStats.totalReports}</div>
              <div className="text-sm text-gray-500">Total Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportStats.reportsByType.Daily || 0}</div>
              <div className="text-sm text-gray-500">Daily Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{reportStats.reportsByType.Weekly || 0}</div>
              <div className="text-sm text-gray-500">Weekly Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{reportStats.reportsByType.Monthly || 0}</div>
              <div className="text-sm text-gray-500">Monthly Reports</div>
            </div>
          </div>

          {/* Format Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Reports by Format</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700">PDF</span>
                  </div>
                  <span className="text-sm font-medium">{reportStats.reportsByFormat.PDF || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span className="text-sm text-gray-700">HTML</span>
                  </div>
                  <span className="text-sm font-medium">{reportStats.reportsByFormat.HTML || 0}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
              {reportStats.recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No recent activity</p>
              ) : (
                <div className="space-y-2">
                  {reportStats.recentActivity.slice(0, 3).map((activity) => (
                    <div key={activity.reportId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'Daily' ? 'bg-blue-400' :
                          activity.type === 'Weekly' ? 'bg-green-400' : 'bg-purple-400'
                        }`} />
                        <span className="text-gray-700">{activity.type} ({activity.format})</span>
                      </div>
                      <span className="text-gray-500">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Reports & Downloads</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {(error.reports || error.reportStats || error.generating) && (
                <button
                  onClick={clearAllErrors}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear Errors
                </button>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={loading.reports || loading.reportStats}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg 
                  className={`w-4 h-4 mr-2 ${(loading.reports || loading.reportStats) ? 'animate-spin' : ''}`} 
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
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 w-fit">
          {[
            { key: 'list', label: 'Available Reports', icon: '📋' },
            { key: 'generate', label: 'Generate New', icon: '➕' },
            { key: 'stats', label: 'Statistics', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'list' && (
            <div>
              <ReportsList showFilters={true} pageSize={12} />
            </div>
          )}
          
          {activeTab === 'generate' && (
            <div className="max-w-2xl">
              <ReportGenerator />
              
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">About Report Generation</h3>
                    <div className="text-sm text-blue-700 mt-1">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Reports are generated based on your API monitoring data</li>
                        <li>Daily reports cover the last 24 hours of data</li>
                        <li>Weekly reports cover the last 7 days</li>
                        <li>Monthly reports cover the last 30 days</li>
                        <li>Generated reports will appear in the "Available Reports" tab</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'stats' && (
            <div>
              <ReportStatsCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;