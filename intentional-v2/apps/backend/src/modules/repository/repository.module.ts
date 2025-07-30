import { Module } from '@nestjs/common';
import { RepositoryService } from './services/repository.service';
import { RepositoryController } from './controllers/repository.controller';

@Module({
  providers: [RepositoryService],
  controllers: [RepositoryController],
  exports: [RepositoryService],
})
export class RepositoryModule {}