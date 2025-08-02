import React, { useEffect, useState } from 'react';
import { useReportsStore } from '../stores/reportsStore';
import type { ReportData } from '../api/reportsApi';
import LoadingSpinner from './LoadingSpinner';

interface ReportsListProps {
  showFilters?: boolean;
  pageSize?: number;
  className?: string;
}

const getReportTypeColor = (type: string): string => {
  switch (type) {
    case 'Daily':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Weekly':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Monthly':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getFormatIcon = (format: string) => {
  switch (format) {
    case 'PDF':
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'HTML':
      return (
        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
};

const formatDate = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
};

const getAvailabilityColor = (availability: number): string => {
  if (availability >= 99) return 'text-green-600';
  if (availability >= 90) return 'text-yellow-600';
  return 'text-red-600';
};

const ReportCard: React.FC<{ 
  report: ReportData; 
  onDownload: (reportId: string) => void; 
  onPreview: (report: ReportData) => void;
  downloadProgress: { progress: number; status: string; error?: string } | null;
}> = ({ report, onDownload, onPreview, downloadProgress }) => {
  const typeColor = getReportTypeColor(report.reportType);
  const isDownloading = downloadProgress?.status === 'downloading';
  const downloadCompleted = downloadProgress?.status === 'completed';
  const downloadError = downloadProgress?.status === 'error';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getFormatIcon(report.format)}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {report.reportType} Report
            </h3>
            <p className="text-sm text-gray-500">
              {formatDate(report.reportDate)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${typeColor}`}>
            {report.reportType}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {report.format}
          </span>
        </div>
      </div>
      
      {report.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{report.summary.totalAPIs}</div>
            <div className="text-xs text-gray-500">Total APIs</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getAvailabilityColor(report.summary.averageAvailability)}`}>
              {report.summary.averageAvailability.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Avg Availability</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{report.summary.totalRequests}</div>
            <div className="text-xs text-gray-500">Total Requests</div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>Generated: {formatDateTime(report.createdAt)}</span>
        <span>{report.apiCount} APIs included</span>
      </div>
      
      {/* Download Progress */}
      {downloadProgress && (
        <div className="mb-4">
          {isDownloading && (
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{downloadProgress.progress}%</span>
            </div>
          )}
          
          {downloadCompleted && (
            <div className="flex items-center space-x-2 text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm">Download completed</span>
            </div>
          )}
          
          {downloadError && (
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm">{downloadProgress.error || 'Download failed'}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => onPreview(report)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Preview
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onDownload(report.id)}
            disabled={isDownloading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReportPreviewModal: React.FC<{
  report: ReportData;
  onClose: () => void;
  onDownload: (reportId: string) => void;
}> = ({ report, onClose, onDownload }) => {
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { previewReport } = useReportsStore();

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      try {
        const preview = await previewReport(report.id);
        if (preview) {
          setPreviewContent(preview.content);
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPreview();
  }, [report.id, previewReport]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getFormatIcon(report.format)}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {report.reportType} Report Preview
              </h2>
              <p className="text-sm text-gray-500">
                {formatDate(report.reportDate)} • {report.format} Format
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDownload(report.id)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" message="Loading preview..." />
            </div>
          ) : previewContent ? (
            report.format === 'HTML' ? (
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-gray-600">PDF preview not available. Please download to view the full report.</p>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Preview not available for this report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportsList: React.FC<ReportsListProps> = ({ 
  showFilters = true, 
  pageSize = 10, 
  className = '' 
}) => {
  const {
    reports,
    total,
    page,
    totalPages,
    loading,
    error,
    filters,
    fetchReports,
    downloadReport,
    setFilters,
    clearFilters,
    getDownloadProgress,
  } = useReportsStore();
  
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchReports({ page: currentPage, limit: pageSize });
  }, [currentPage, pageSize, fetchReports]);

  const handleDownload = (reportId: string) => {
    downloadReport(reportId);
  };

  const handlePreview = (report: ReportData) => {
    setSelectedReport(report);
  };

  const handleClosePreview = () => {
    setSelectedReport(null);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters({ [filterType]: value || null });
    setCurrentPage(1); // Reset to first page when filtering
    fetchReports({ page: 1, limit: pageSize });
  };

  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
    fetchReports({ page: 1, limit: pageSize });
  };

  if (loading.reports && reports.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <LoadingSpinner size="lg" message="Loading reports..." />
      </div>
    );
  }

  if (error.reports) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load reports</h3>
            <p className="text-sm text-red-700 mt-1">{error.reports.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filter Reports</h3>
            {(filters.type || filters.format || filters.collectionId) && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <select
                value={filters.format || ''}
                onChange={(e) => handleFilterChange('format', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Formats</option>
                <option value="HTML">HTML</option>
                <option value="PDF">PDF</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
              <select
                value={filters.collectionId || ''}
                onChange={(e) => handleFilterChange('collectionId', e.target.value)}
                className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Collections</option>
                {/* TODO: Add collection options */}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Available Reports</h2>
          <p className="text-sm text-gray-600">
            {total} report{total !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
            <p className="text-gray-500">Reports will appear here once they are generated.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onDownload={handleDownload}
                onPreview={handlePreview}
                downloadProgress={getDownloadProgress(report.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {page} of {totalPages} ({total} total reports)
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="px-3 py-1 text-sm bg-blue-50 border border-blue-200 rounded-md">
              {page}
            </span>
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {selectedReport && (
        <ReportPreviewModal
          report={selectedReport}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default ReportsList;