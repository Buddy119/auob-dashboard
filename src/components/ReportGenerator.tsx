import React, { useState } from 'react';
import { useReportsStore } from '../stores/reportsStore';
import type { ReportGenerationRequest } from '../api/reportsApi';
import LoadingSpinner from './LoadingSpinner';

interface ReportGeneratorProps {
  className?: string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ className = '' }) => {
  const [formData, setFormData] = useState<ReportGenerationRequest>({
    type: 'Daily',
    format: 'PDF',
    startDate: '',
    endDate: '',
    collectionId: '',
  });
  
  const [isMultiFormat, setIsMultiFormat] = useState(false);
  
  const { 
    loading, 
    error, 
    generateReport, 
    generateMultiFormatReport,
    clearError 
  } = useReportsStore();

  const handleInputChange = (field: keyof ReportGenerationRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError('generating');
    
    try {
      if (isMultiFormat) {
        const { format, ...requestData } = formData;
        await generateMultiFormatReport(requestData);
      } else {
        await generateReport(formData);
      }
      
      // Reset form on success
      setFormData({
        type: 'Daily',
        format: 'PDF',
        startDate: '',
        endDate: '',
        collectionId: '',
      });
    } catch (error) {
      // Error is handled by the store
    }
  };

  const getDefaultDateRange = (type: string): { startDate: string; endDate: string } => {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    
    let startDate: string;
    switch (type) {
      case 'Weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'Monthly':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      default: // Daily
        const dayAgo = new Date(now);
        dayAgo.setDate(now.getDate() - 1);
        startDate = dayAgo.toISOString().split('T')[0];
        break;
    }
    
    return { startDate, endDate };
  };

  const handleTypeChange = (type: string) => {
    const dateRange = getDefaultDateRange(type);
    setFormData(prev => ({
      ...prev,
      type: type as ReportGenerationRequest['type'],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }));
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Generate New Report</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create custom reports based on your API monitoring data
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Multi-format:</label>
          <input
            type="checkbox"
            checked={isMultiFormat}
            onChange={(e) => setIsMultiFormat(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      </div>

      {error.generating && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to generate report</h3>
              <p className="text-sm text-red-700 mt-1">{error.generating.message}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              required
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Daily">Daily Report</option>
              <option value="Weekly">Weekly Report</option>
              <option value="Monthly">Monthly Report</option>
            </select>
          </div>

          {!isMultiFormat && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Format
              </label>
              <select
                value={formData.format}
                onChange={(e) => handleInputChange('format', e.target.value)}
                required
                className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PDF">PDF</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          )}
          
          {isMultiFormat && (
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>PDF</span>
                  <span>&</span>
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>HTML</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Both formats will be generated</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Collection (Optional)
          </label>
          <select
            value={formData.collectionId}
            onChange={(e) => handleInputChange('collectionId', e.target.value)}
            className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Collections</option>
            {/* TODO: Add collection options from dashboard store */}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to include all collections in the report
          </p>
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-600">
            {isMultiFormat ? (
              <span>Generate both PDF and HTML formats</span>
            ) : (
              <span>Generate {formData.format} format only</span>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading.generating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.generating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate Report
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportGenerator;