import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { IpcModule } from './modules/ipc/ipc.module';
import { GitModule } from './modules/git/git.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { RepositoryModule } from './modules/repository/repository.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MessagesModule } from './modules/messages/messages.module';
import { BranchesModule } from './modules/branches/branches.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Event system for internal communication
    EventEmitterModule.forRoot(),
    
    // Scheduling for periodic sync
    ScheduleModule.forRoot(),
    
    // IPC communication module
    IpcModule,
    
    // Core modules
    GitModule,
    CollaborationModule,
    RepositoryModule,
    
    // Feature modules
    TasksModule,
    MessagesModule,
    BranchesModule,
  ],
  controllers: [],
})
export class AppModule {}