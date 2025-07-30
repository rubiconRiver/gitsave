import { Injectable } from '@nestjs/common';
import { CollaborationGitService } from '../../git/services/collaboration-git.service';
import { GitQueueService } from '../../git/services/git-queue.service';
import * as path from 'path';

/**
 * Repository for collaboration data
 * Handles all Git operations for collaboration branch
 */
@Injectable()
export class CollaborationRepository {
  constructor(
    private collaborationGit: CollaborationGitService,
    private gitQueue: GitQueueService,
  ) {
    // Register queue handlers
    this.registerQueueHandlers();
  }
  
  /**
   * Ensure user directory exists
   */
  async ensureUserDirectory(username: string): Promise<void> {
    // This will be created when first data is saved
  }
  
  /**
   * Save user data
   */
  async saveUserData(username: string, dataType: string, data: any): Promise<void> {
    const filePath = `${username}/${dataType}.json`;
    
    // Queue the write operation
    const operation = await this.gitQueue.enqueue(
      'write-collaboration',
      { filePath, data },
      8 // High priority
    );
    
    // Wait for completion
    await this.gitQueue.waitForOperation(operation.id);
  }
  
  /**
   * Get user data
   */
  async getUserData(username: string, dataType?: string): Promise<any> {
    if (dataType) {
      // Get specific data type
      const filePath = `${username}/${dataType}.json`;
      return await this.collaborationGit.readJsonFile(filePath);
    } else {
      // Get all user data
      return await this.collaborationGit.readUserData(username);
    }
  }
  
  /**
   * Delete user data
   */
  async deleteUserData(username: string, dataType: string): Promise<void> {
    // For deletion, we'll write null to the file
    // Git doesn't easily support file deletion without checkout
    const filePath = `${username}/${dataType}.json`;
    
    const operation = await this.gitQueue.enqueue(
      'write-collaboration',
      { filePath, data: null },
      8
    );
    
    await this.gitQueue.waitForOperation(operation.id);
  }
  
  /**
   * List all users
   */
  async listUsers(): Promise<string[]> {
    return await this.collaborationGit.listUserDirectories();
  }
  
  /**
   * Get all data for all users
   */
  async getAllData(): Promise<Record<string, any>> {
    const users = await this.listUsers();
    const allData: Record<string, any> = {};
    
    for (const username of users) {
      allData[username] = await this.getUserData(username);
    }
    
    return allData;
  }
  
  /**
   * Register handlers for Git queue
   */
  private registerQueueHandlers() {
    // Handler for writing to collaboration branch
    this.gitQueue.registerHandler('write-collaboration', async (operation) => {
      const { filePath, data } = operation.payload;
      await this.collaborationGit.writeJsonFile(filePath, data);
      return { success: true, filePath };
    });
    
    // Handler for reading from collaboration branch
    this.gitQueue.registerHandler('read-collaboration', async (operation) => {
      const { filePath } = operation.payload;
      const data = await this.collaborationGit.readJsonFile(filePath);
      return { success: true, data };
    });
  }
}