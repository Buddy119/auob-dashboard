import { Module } from '@nestjs/common';
import { STORAGE } from './storage.tokens';
import { LocalStorage } from './local.storage';

@Module({
  providers: [{ provide: STORAGE, useClass: LocalStorage }],
  exports: [STORAGE],
})
export class StorageModule {}
