import { IStorage, PutParams } from './storage.interface';
import { Injectable } from '@nestjs/common';
import { createWriteStream } from 'fs';
// import path from 'path';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Readable } from 'stream';

@Injectable()
export class LocalStorage implements IStorage {
  private root: string;

  constructor() {
    const envDir = process.env.UPLOAD_DIR || './uploads';
    this.root = path.isAbsolute(envDir) ? envDir : path.join(process.cwd(), envDir);
  }

  async putObject({ bucket, key, body }: PutParams): Promise<string> {
    const abs = path.join(this.root, bucket, key);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    if (Buffer.isBuffer(body)) {
      await fs.writeFile(abs, body);
    } else if (body instanceof Readable) {
      await new Promise<void>((resolve, reject) => {
        body
          .pipe(createWriteStream(abs))
          .on('finish', () => resolve())
          .on('error', reject);
      });
    } else {
      throw new Error('Unsupported body type');
    }
    return `local://${bucket}/${key}`;
  }

  getPathFromUri(uri: string): string {
    if (!uri.startsWith('local://')) throw new Error('Unsupported URI');
    const rel = uri.replace('local://', '');
    return path.join(this.root, rel);
  }
}
