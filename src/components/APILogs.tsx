import React, { useState } from 'react';
import { useLogsStore } from '../stores/logsStore';
import type { APIRunResult } from '../api/logsApi';
import LoadingSpinner from './LoadingSpinner';

interface APILogsProps {
  runId?: string;
  collectionId?: string;
  className?: string;
}

const getStatusColor = (success: boolean, statusCode?: number | null): string => {
  if (!success || !statusCode) return 'text-red-600 bg-red-50 border-red-200';
  if (statusCode >= 200 && statusCode < 300) return 'text-green-600 bg-green-50 border-green-200';
  if (statusCode >= 300 && statusCode < 400) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (statusCode >= 400 && statusCode < 500) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
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

const formatResponseTime = (responseTime: number | null): string => {
  if (!responseTime) return 'N/A';
  if (responseTime < 1000) return `${responseTime.toFixed(0)}ms`;
  return `${(responseTime / 1000).toFixed(2)}s`;
};

const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};

const APIResultCard: React.FC<{ result: APIRunResult; onSelect: (result: APIRunResult) => void }> = ({ 
  result, 
  onSelect 
}) => {
  const statusColor = getStatusColor(result.success, result.statusCode);
  const methodColor = getMethodColor(result.method);

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={() => onSelect(result)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${methodColor}`}>
            {result.method.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColor}`}>
            {result.statusCode || 'N/A'}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {formatTimestamp(result.timestamp)}
        </div>
      </div>
      
      <div className="mb-2">
        <h4 className="font-medium text-gray-900 truncate">{result.requestName}</h4>
        <p className="text-sm text-gray-500 font-mono truncate">{result.url}</p>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className={`flex items-center ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {result.success ? 'Pass' : 'Fail'}
          </span>
          
          <span className="text-gray-600">
            {formatResponseTime(result.responseTime)}
          </span>
        </div>
        
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      
      {result.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {result.errorMessage}
        </div>
      )}
    </div>
  );
};

const APIResultDetails: React.FC<{ result: APIRunResult; onClose: () => void }> = ({ 
  result, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'headers' | 'body' | 'assertions'>('overview');
  const statusColor = getStatusColor(result.success, result.statusCode);
  const methodColor = getMethodColor(result.method);

  const formatJSON = (data: any): string => {
    try {
      if (typeof data === 'string') {
        return JSON.stringify(JSON.parse(data), null, 2);
      }
      return JSON.stringify(data, null, 2);
    } catch {
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded text-sm font-medium border ${methodColor}`}>
              {result.method.toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded text-sm font-medium border ${statusColor}`}>
              {result.statusCode || 'N/A'}
            </span>
            <h2 className="text-lg font-semibold text-gray-900">{result.requestName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex border-b border-gray-200">
          {['overview', 'headers', 'body', 'assertions'].map((tab) => (
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
              {tab === 'assertions' && result.assertions && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 text-xs rounded-full">
                  {Object.keys(result.assertions).length}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                    <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded break-all">
                      {result.url}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Response Time</label>
                    <p className="text-sm text-gray-900">
                      {formatResponseTime(result.responseTime)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                    <p className="text-sm text-gray-900">
                      {formatTimestamp(result.timestamp)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <p className="text-sm text-gray-900">{result.itemName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Run ID</label>
                    <p className="text-sm font-mono text-gray-600">{result.runId}</p>
                  </div>
                </div>
              </div>
              
              {result.errorMessage && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-700">{result.errorMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'headers' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Response Headers</h3>
              {result.responseHeaders ? (
                <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono overflow-x-auto">
                  {formatJSON(result.responseHeaders)}
                </pre>
              ) : (
                <p className="text-gray-500 italic">No response headers available</p>
              )}
            </div>
          )}
          
          {activeTab === 'body' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Response Body</h3>
              {result.responseBody ? (
                <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {result.responseBody}
                </pre>
              ) : (
                <p className="text-gray-500 italic">No response body available</p>
              )}
            </div>
          )}
          
          {activeTab === 'assertions' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Test Assertions</h3>
              {result.assertions ? (
                <pre className="bg-gray-50 border border-gray-200 rounded p-4 text-sm font-mono overflow-x-auto">
                  {formatJSON(result.assertions)}
                </pre>
              ) : (
                <p className="text-gray-500 italic">No assertions data available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const APILogs: React.FC<APILogsProps> = ({ runId, collectionId, className = '' }) => {
  const {
    apiResults,
    loading,
    error,
    fetchAPIResults,
    setCurrentAPIResult,
  } = useLogsStore();
  
  const [selectedResult, setSelectedResult] = useState<APIRunResult | null>(null);
  
  React.useEffect(() => {
    fetchAPIResults({
      runId,
      collectionId,
      limit: 50,
    });
  }, [runId, collectionId, fetchAPIResults]);
  
  const handleSelectResult = (result: APIRunResult) => {
    setSelectedResult(result);
    setCurrentAPIResult(result);
  };
  
  const handleCloseDetails = () => {
    setSelectedResult(null);
    setCurrentAPIResult(null);
  };

  if (loading.apiResults) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" message="Loading API execution logs..." />
      </div>
    );
  }

  if (error.apiResults) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load API logs</h3>
            <p className="text-sm text-red-700 mt-1">{error.apiResults.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">API Execution Logs</h2>
        <p className="text-sm text-gray-600">
          {apiResults.length} result{apiResults.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      {apiResults.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No API logs available</h3>
          <p className="text-gray-500">Run a collection to see detailed execution logs here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiResults.map((result) => (
            <APIResultCard
              key={result.id}
              result={result}
              onSelect={handleSelectResult}
            />
          ))}
        </div>
      )}
      
      {selectedResult && (
        <APIResultDetails
          result={selectedResult}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
};

export default APILogs;