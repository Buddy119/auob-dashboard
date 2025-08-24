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
