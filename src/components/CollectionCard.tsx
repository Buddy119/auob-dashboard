import React from 'react';
import { useDashboardStore } from '../stores/dashboardStore';
import type { CollectionAvailabilityData } from '../api/dashboardApi';

interface CollectionCardProps {
  collection: CollectionAvailabilityData;
}

const getAvailabilityColor = (availability: number): string => {
  if (availability >= 99) return 'text-green-600 bg-green-50 border-green-200';
  if (availability >= 90) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
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

const CollectionCard: React.FC<CollectionCardProps> = ({ collection }) => {
  const { expandedCollections, toggleCollectionExpansion, fetchCollectionAvailability } = useDashboardStore();
  
  const isExpanded = expandedCollections.has(collection.collectionId);
  const availabilityColor = getAvailabilityColor(collection.overallAvailability);
  
  const handleToggleExpansion = async () => {
    toggleCollectionExpansion(collection.collectionId);
    
    // Fetch fresh data when expanding
    if (!isExpanded) {
      await fetchCollectionAvailability(collection.collectionId);
    }
  };
  
  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Card Header */}
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={handleToggleExpansion}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {collection.collectionName}
              </h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${availabilityColor}`}>
                {collection.overallAvailability.toFixed(1)}% Available
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {collection.totalAPIs} APIs
              </span>
              
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {collection.highAvailabilityAPIs} High
              </span>
              
              {collection.mediumAvailabilityAPIs > 0 && (
                <span className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                  {collection.mediumAvailabilityAPIs} Medium
                </span>
              )}
              
              {collection.lowAvailabilityAPIs > 0 && (
                <span className="flex items-center text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                  {collection.lowAvailabilityAPIs} Low
                </span>
              )}
            </div>
          </div>
          
          <div className="ml-4 flex items-center">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          Last updated: {formatDate(collection.lastUpdated)}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Summary Stats */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{collection.totalAPIs}</div>
                <div className="text-sm text-gray-500">Total APIs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{collection.highAvailabilityAPIs}</div>
                <div className="text-sm text-gray-500">High (&ge;99%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{collection.mediumAvailabilityAPIs}</div>
                <div className="text-sm text-gray-500">Medium (90-98%)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{collection.lowAvailabilityAPIs}</div>
                <div className="text-sm text-gray-500">Low (&lt;90%)</div>
              </div>
            </div>
          </div>
          
          {/* API List */}
          <div className="px-6 py-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">API Details</h4>
            
            {collection.apis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-3V8M8 10h8m-4 6h4" />
                </svg>
                <p>No API data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {collection.apis.map((api, index) => (
                  <div
                    key={`${api.apiName}-${api.method}-${index}`}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow duration-200"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`px-2 py-1 rounded text-xs font-medium border ${getMethodBadgeColor(api.method)}`}>
                        {api.method.toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {api.apiName}
                        </div>
                        <div className="text-sm text-gray-500 truncate font-mono">
                          {api.url}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getAvailabilityColor(api.availability).split(' ')[0]}`}>
                          {api.availability.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {api.successCount}/{api.totalCount} success
                        </div>
                      </div>
                      
                      <div className={`w-3 h-3 rounded-full ${
                        api.status === 'high' ? 'bg-green-500' :
                        api.status === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionCard;