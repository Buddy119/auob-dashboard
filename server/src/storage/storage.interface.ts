import { Readable } from 'stream';

export type PutParams = {
  bucket: string;
  key: string;
  body: Buffer | Readable;
  contentType?: string;
};

export interface IStorage {
  putObject(params: PutParams): Promise<string>; // returns a URI like local://bucket/key
  getPathFromUri(uri: string): string;          // absolute path for local provider
}
