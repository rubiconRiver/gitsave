import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollaborationRepository } from '../repositories/collaboration.repository';
import { CollaborationCacheService } from './collaboration-cache.service';
import { IpcService } from '../../ipc/ipc.service';

/**
 * Handles periodic syncing of collaboration data
 */
@Injectable()
export class CollaborationSyncService implements OnModuleInit {
  private lastSyncData: Record<string, any> = {};
  private isSyncing = false;
  
  constructor(
    private repository: CollaborationRepository,
    private cache: CollaborationCacheService,
    private eventEmitter: EventEmitter2,
    private ipcService: IpcService,
  ) {}
  
  onModuleInit() {
    // Do initial sync
    this.sync();
  }
  
  /**
   * Sync collaboration data every 60 seconds
   */
  @Cron('0 * * * * *')
  async handleSync() {
    await this.sync();
  }
  
  /**
   * Force sync immediately
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }
    
    try {
      this.isSyncing = true;
      
      // Notify UI that sync is starting
      this.ipcService.broadcast('sync:started', {
        timestamp: new Date(),
      });
      
      // Get all current data
      const currentData = await this.repository.getAllData();
      
      // Find changes
      const changes = this.detectChanges(this.lastSyncData, currentData);
      
      // Update cache with new data
      for (const [username, userData] of Object.entries(currentData)) {
        for (const [dataType, data] of Object.entries(userData)) {
          await this.cache.set(`${username}/${dataType}`, data);
        }
      }
      
      // Emit events for changes
      for (const change of changes) {
        this.eventEmitter.emit('collaboration.data-changed', change);
        
        // Send to UI via IPC
        this.ipcService.broadcast(`collaboration:${change.type}`, change);
      }
      
      // Update last sync data
      this.lastSyncData = currentData;
      
      // Notify UI that sync is complete
      this.ipcService.broadcast('sync:completed', {
        timestamp: new Date(),
        changesCount: changes.length,
      });
      
    } catch (error) {
      console.error('Sync failed:', error);
      
      this.ipcService.broadcast('sync:error', {
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Detect changes between two data snapshots
   */
  private detectChanges(oldData: Record<string, any>, newData: Record<string, any>): any[] {
    const changes: any[] = [];
    const allUsers = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    for (const username of allUsers) {
      const oldUserData = oldData[username] || {};
      const newUserData = newData[username] || {};
      
      const allDataTypes = new Set([
        ...Object.keys(oldUserData),
        ...Object.keys(newUserData),
      ]);
      
      for (const dataType of allDataTypes) {
        const oldValue = oldUserData[dataType];
        const newValue = newUserData[dataType];
        
        // Simple change detection
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          if (!oldValue && newValue) {
            changes.push({
              type: 'created',
              username,
              dataType,
              data: newValue,
            });
          } else if (oldValue && !newValue) {
            changes.push({
              type: 'deleted',
              username,
              dataType,
              oldData: oldValue,
            });
          } else {
            changes.push({
              type: 'updated',
              username,
              dataType,
              oldData: oldValue,
              data: newValue,
            });
          }
        }
      }
    }
    
    return changes;
  }
  
  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSync: this.lastSyncData ? new Date() : null,
      userCount: Object.keys(this.lastSyncData).length,
    };
  }
}