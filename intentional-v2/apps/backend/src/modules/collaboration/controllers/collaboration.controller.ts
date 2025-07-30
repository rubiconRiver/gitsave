import { Controller, Injectable } from '@nestjs/common';
import { IpcHandle } from '../../ipc/ipc.handler';
import { CollaborationService } from '../services/collaboration.service';
import { CollaborationSyncService } from '../services/collaboration-sync.service';

/**
 * IPC handlers for collaboration features
 */
@Controller()
@Injectable()
export class CollaborationController {
  constructor(
    private collaborationService: CollaborationService,
    private syncService: CollaborationSyncService,
  ) {}
  
  @IpcHandle('collaboration:initialize')
  async initialize(username: string) {
    await this.collaborationService.initialize(username);
    return { success: true };
  }
  
  @IpcHandle('collaboration:save-my-data')
  async saveMyData(dataType: string, data: any) {
    await this.collaborationService.saveMyData(dataType, data);
    return { success: true };
  }
  
  @IpcHandle('collaboration:get-my-data')
  async getMyData(dataType?: string) {
    const data = await this.collaborationService.getMyData(dataType);
    return data;
  }
  
  @IpcHandle('collaboration:get-user-data')
  async getUserData(username: string, dataType?: string) {
    const data = await this.collaborationService.getUserData(username, dataType);
    return data;
  }
  
  @IpcHandle('collaboration:get-all-users-data')
  async getAllUsersData(dataType: string) {
    const data = await this.collaborationService.getAllUsersData(dataType);
    return data;
  }
  
  @IpcHandle('collaboration:get-team-members')
  async getTeamMembers() {
    const members = await this.collaborationService.getTeamMembers();
    return members;
  }
  
  @IpcHandle('collaboration:broadcast')
  async broadcast(event: string, data: any) {
    await this.collaborationService.broadcastToTeam(event, data);
    return { success: true };
  }
  
  @IpcHandle('collaboration:delete-my-data')
  async deleteMyData(dataType: string) {
    await this.collaborationService.deleteMyData(dataType);
    return { success: true };
  }
  
  @IpcHandle('collaboration:force-sync')
  async forceSync() {
    await this.syncService.sync();
    return { success: true };
  }
  
  @IpcHandle('collaboration:get-sync-status')
  async getSyncStatus() {
    return this.syncService.getSyncStatus();
  }
}