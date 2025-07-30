import { Module } from '@nestjs/common';
import { CollaborationService } from './services/collaboration.service';
import { CollaborationRepository } from './repositories/collaboration.repository';
import { CollaborationCacheService } from './services/collaboration-cache.service';
import { CollaborationSyncService } from './services/collaboration-sync.service';
import { CollaborationController } from './controllers/collaboration.controller';

@Module({
  providers: [
    CollaborationService,
    CollaborationRepository,
    CollaborationCacheService,
    CollaborationSyncService,
  ],
  controllers: [CollaborationController],
  exports: [CollaborationService],
})
export class CollaborationModule {}