import { Injectable } from '@nestjs/common';
import { CollaborationRepository } from '../repositories/collaboration.repository';
import { CollaborationCacheService } from './collaboration-cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * High-level service for collaboration features
 * This is what other developers will use - no Git knowledge required!
 */
@Injectable()
export class CollaborationService {
  private currentUsername: string = '';
  
  constructor(
    private repository: CollaborationRepository,
    private cache: CollaborationCacheService,
    private eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Initialize collaboration for a user
   */
  async initialize(username: string) {
    this.currentUsername = username;
    await this.repository.ensureUserDirectory(username);
  }
  
  /**
   * Save data for the current user
   * @param dataType Type of data (e.g., 'tasks', 'profile', 'branches')
   * @param data The data to save
   */
  async saveMyData(dataType: string, data: any): Promise<void> {
    if (!this.currentUsername) {
      throw new Error('Collaboration not initialized. Call initialize() first.');
    }
    
    // Save to repository
    await this.repository.saveUserData(this.currentUsername, dataType, data);
    
    // Update cache
    await this.cache.set(`${this.currentUsername}/${dataType}`, data);
    
    // Emit event
    this.eventEmitter.emit('collaboration.data-saved', {
      username: this.currentUsername,
      dataType,
      data,
    });
  }
  
  /**
   * Get data for the current user
   */
  async getMyData(dataType?: string): Promise<any> {
    if (!this.currentUsername) {
      throw new Error('Collaboration not initialized. Call initialize() first.');
    }
    
    return this.getUserData(this.currentUsername, dataType);
  }
  
  /**
   * Get data for any user
   */
  async getUserData(username: string, dataType?: string): Promise<any> {
    // Try cache first
    const cacheKey = dataType ? `${username}/${dataType}` : username;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    // Load from repository
    const data = await this.repository.getUserData(username, dataType);
    
    // Update cache
    await this.cache.set(cacheKey, data);
    
    return data;
  }
  
  /**
   * Get data for all users of a specific type
   */
  async getAllUsersData(dataType: string): Promise<Record<string, any>> {
    const users = await this.repository.listUsers();
    const result: Record<string, any> = {};
    
    for (const username of users) {
      const userData = await this.getUserData(username, dataType);
      if (userData) {
        result[username] = userData;
      }
    }
    
    return result;
  }
  
  /**
   * Broadcast an event to all team members
   */
  async broadcastToTeam(event: string, data: any): Promise<void> {
    this.eventEmitter.emit('collaboration.team-broadcast', {
      from: this.currentUsername,
      event,
      data,
      timestamp: new Date(),
    });
  }
  
  /**
   * Get list of all team members
   */
  async getTeamMembers(): Promise<string[]> {
    return this.repository.listUsers();
  }
  
  /**
   * Check if user exists in collaboration
   */
  async userExists(username: string): Promise<boolean> {
    const users = await this.repository.listUsers();
    return users.includes(username);
  }
  
  /**
   * Delete data for current user
   */
  async deleteMyData(dataType: string): Promise<void> {
    if (!this.currentUsername) {
      throw new Error('Collaboration not initialized. Call initialize() first.');
    }
    
    await this.repository.deleteUserData(this.currentUsername, dataType);
    await this.cache.invalidate(`${this.currentUsername}/${dataType}`);
    
    this.eventEmitter.emit('collaboration.data-deleted', {
      username: this.currentUsername,
      dataType,
    });
  }
}