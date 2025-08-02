import axios, { type AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export interface CollectionUploadResponse {
  success: boolean;
  message: string;
  collectionId?: string;
  data?: unknown;
}

export interface CollectionUploadError {
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

export const collectionApi = {
  uploadCollection: async (formData: FormData): Promise<CollectionUploadResponse> => {
    try {
      const response: AxiosResponse<CollectionUploadResponse> = await api.post(
        '/api/collections/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorData: CollectionUploadError = {
          message: error.response?.data?.message || 'Failed to upload collection',
          errors: error.response?.data?.errors,
          status: error.response?.status,
        };
        throw errorData;
      }
      
      throw {
        message: 'An unexpected error occurred while uploading the collection',
      } as CollectionUploadError;
    }
  },

  getCollections: async (): Promise<unknown[]> => {
    try {
      const response = await api.get('/api/collections');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch collections',
          status: error.response?.status,
        } as CollectionUploadError;
      }
      
      throw {
        message: 'An unexpected error occurred while fetching collections',
      } as CollectionUploadError;
    }
  },

  getCollectionById: async (collectionId: string): Promise<unknown> => {
    try {
      const response = await api.get(`/api/collections/${collectionId}`);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to fetch collection',
          status: error.response?.status,
        } as CollectionUploadError;
      }
      
      throw {
        message: 'An unexpected error occurred while fetching the collection',
      } as CollectionUploadError;
    }
  },

  runCollection: async (collectionId: string, config?: unknown): Promise<unknown> => {
    try {
      const response = await api.post(`/api/collections/${collectionId}/run`, config);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to run collection',
          status: error.response?.status,
        } as CollectionUploadError;
      }
      
      throw {
        message: 'An unexpected error occurred while running the collection',
      } as CollectionUploadError;
    }
  },

  deleteCollection: async (collectionId: string): Promise<void> => {
    try {
      await api.delete(`/api/collections/${collectionId}`);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw {
          message: error.response?.data?.message || 'Failed to delete collection',
          status: error.response?.status,
        } as CollectionUploadError;
      }
      
      throw {
        message: 'An unexpected error occurred while deleting the collection',
      } as CollectionUploadError;
    }
  },
};

export default collectionApi;