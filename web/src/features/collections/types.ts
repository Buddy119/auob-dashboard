export type CollectionListItem = {
  id: string;
  name: string;
  version?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { envs: number; requests: number; runs: number };
};

export type CollectionListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: CollectionListItem[];
};

export type UploadResponse = { collectionId: string };

export type CollectionEnv = {
  id: string;
  name: string;
  isDefault: boolean;
  fileUri: string;
  createdAt: string;
};

export type RequestItem = {
  id: string;
  name: string;
  method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'|'HEAD'|'OPTIONS'|'TRACE';
  url: string;
  path: string; // e.g., "Users/List Users"
  isCritical: boolean;
};

export type CollectionDetail = {
  id: string;
  name: string;
  version?: string | null;
  description?: string | null;
  fileUri: string;
  createdAt: string;
  updatedAt: string;
  envs: CollectionEnv[];
  _count: { requests: number; runs: number };
  requests?: RequestItem[]; // present when withRequests=true
};
