import React from 'react';
import type { APIAvailabilityData } from '../api/dashboardApi';

interface APIStatusDetailProps {
  api: APIAvailabilityData;
  showTrend?: boolean;
  className?: string;
}

const getAvailabilityColor = (availability: number): { bg: string; text: string; border: string } => {
  if (availability >= 99) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
    };
  }
  if (availability >= 90) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
    };
  }
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  };
};

const getMethodBadgeColor = (method: string): string => {
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

const getStatusIcon = (status: 'high' | 'medium' | 'low') => {
  switch (status) {
    case 'high':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'medium':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'low':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};

const APIStatusDetail: React.FC<APIStatusDetailProps> = ({ 
  api, 
  showTrend = false, 
  className = '' 
}) => {
  const colors = getAvailabilityColor(api.availability);
  const successRate = api.totalCount > 0 ? (api.successCount / api.totalCount) * 100 : 0;
  
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(api.status)}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{api.apiName}</h3>
            <p className="text-sm text-gray-500 font-mono break-all">{api.url}</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded text-xs font-medium border ${getMethodBadgeColor(api.method)}`}>
          {api.method.toUpperCase()}
        </div>
      </div>
      
      {/* Availability Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Availability</p>
              <p className={`text-2xl font-bold ${colors.text}`}>
                {api.availability.toFixed(1)}%
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              api.status === 'high' ? 'bg-green-500' :
              api.status === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-700">
                {successRate.toFixed(1)}%
              </p>
            </div>
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Requests</p>
              <p className="text-2xl font-bold text-purple-700">
                {api.totalCount}
              </p>
            </div>
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Detailed Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Successful Requests</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-green-600 font-medium">{api.successCount}</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-600">Failed Requests</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-red-600 font-medium">{api.totalCount - api.successCount}</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${100 - successRate}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium text-gray-600">Collection ID</span>
          <span className="text-sm text-gray-500 font-mono">{api.collectionId}</span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            api.status === 'high' ? 'bg-green-500' :
            api.status === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-xs text-gray-500 capitalize">
            {api.status} availability
          </span>
        </div>
        
        {showTrend && (
          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            View Trend →
          </button>
        )}
      </div>
    </div>
  );
};

export default APIStatusDetail;