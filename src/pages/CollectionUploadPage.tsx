import React, { useState } from 'react';
import CollectionUploader from '../components/CollectionUploader';
import { collectionApi, type CollectionUploadResponse, type CollectionUploadError } from '../api/collectionApi';

const CollectionUploadPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<CollectionUploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<CollectionUploadError | null>(null);

  const handleCollectionUpload = async (formData: FormData): Promise<void> => {
    setIsLoading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const result = await collectionApi.uploadCollection(formData);
      setUploadResult(result);
    } catch (error) {
      setUploadError(error as CollectionUploadError);
    } finally {
      setIsLoading(false);
    }
  };

  const resetResults = () => {
    setUploadResult(null);
    setUploadError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Collection Upload</h1>
          <p className="mt-2 text-gray-600">
            Upload your Postman Collection and configure advanced settings for API testing.
          </p>
        </div>

        {/* Success Message */}
        {uploadResult && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{uploadResult.message}</p>
                  {uploadResult.collectionId && (
                    <p className="mt-1">Collection ID: <code className="bg-green-100 px-1 rounded">{uploadResult.collectionId}</code></p>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={resetResults}
                    className="bg-green-100 px-3 py-1 rounded-md text-sm font-medium text-green-800 hover:bg-green-200"
                  >
                    Upload Another Collection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{uploadError.message}</p>
                  {uploadError.errors && (
                    <div className="mt-2">
                      <p className="font-medium">Validation Errors:</p>
                      <ul className="mt-1 list-disc list-inside">
                        {Object.entries(uploadError.errors).map(([field, errors]) => (
                          <li key={field}>
                            <span className="font-medium">{field}:</span> {errors.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uploadError.status && (
                    <p className="mt-1 text-xs">Status Code: {uploadError.status}</p>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={resetResults}
                    className="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Uploading collection...</p>
                <p className="text-sm text-blue-600">Please wait while we process your request.</p>
              </div>
            </div>
          </div>
        )}

        {/* Collection Uploader Component */}
        {!uploadResult && (
          <CollectionUploader onSubmit={handleCollectionUpload} />
        )}

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Usage Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>Collection File:</strong> Upload a valid Postman Collection JSON file (required).</p>
            <p><strong>SSL Configuration:</strong> Optionally upload SSL certificates for secure connections.</p>
            <p><strong>Proxy Settings:</strong> Configure HTTP/HTTPS proxies if your network requires them.</p>
            <p><strong>Redirects:</strong> Choose whether to follow HTTP redirects during request execution.</p>
            <p><strong>Variable Sets:</strong> Define multiple sets of input variables to test different scenarios.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionUploadPage;