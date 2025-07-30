import { Module, Global } from '@nestjs/common';
import { GitCoreService } from './services/git-core.service';
import { CollaborationGitService } from './services/collaboration-git.service';
import { GitQueueService } from './services/git-queue.service';

@Global()
@Module({
  providers: [
    GitCoreService,
    CollaborationGitService,
    GitQueueService,
  ],
  exports: [
    GitCoreService,
    CollaborationGitService,
    GitQueueService,
  ],
})
export class GitModule {}