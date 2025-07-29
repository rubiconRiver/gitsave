import { EventEmitter } from 'events';
import { CollaborationRepository, CollaborationData } from './CollaborationRepository';
import { MessageTable } from './tables/MessageTable';
import { BranchTable } from './tables/BranchTable';
import { TaskTable } from './tables/TaskTable';
import { ActivityTable } from './tables/ActivityTable';
import { UserTable } from './tables/UserTable';
import { GitService } from '../services/GitService';

/**
 * COLLABORATION STORE - The Easy Way to Access Team Data
 * 
 * This class makes it simple to work with collaboration features.
 * It hides all the Git complexity and provides simple methods.
 * 
 * USAGE EXAMPLES:
 * 
 * // Get all messages for current user
 * const messages = await store.messages.getInbox();
 * 
 * // Send a message
 * await store.messages.send('partner', 'Hey, check this out!');
 * 
 * // Get tasks assigned to someone
 * const tasks = await store.tasks.getAssignedTo('partner');
 * 
 * // Update user status
 * await store.users.updateStatus('busy', 'In a meeting');
 * 
 * TO ADD NEW FEATURES (e.g., "picture space"):
 * 1. Create a new table class in tables/ folder
 * 2. Add it as a property here (like this.pictures = new PictureTable())
 * 3. The table class handles all the logic
 * 
 * IMPORTANT: This store automatically syncs with Git every 60 seconds
 * and whenever important changes are made.
 */
export class CollaborationStore extends EventEmitter {
  private static instance: CollaborationStore;
  private repository: CollaborationRepository;
  private data: CollaborationData = {};
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  
  // Tables - Each table provides specific functionality
  public messages: MessageTable;
  public branches: BranchTable;
  public tasks: TaskTable;
  public activity: ActivityTable;
  public users: UserTable;
  
  // TO ADD NEW FEATURES: Add new tables here
  // public pictures: PictureTable;
  // public notes: NoteTable;
  
  private constructor(
    gitService: GitService,
    repoPath: string,
    private currentUsername: string
  ) {
    super();
    this.repository = new CollaborationRepository(gitService, repoPath, currentUsername);
    
    // Initialize tables with reference to store
    this.messages = new MessageTable(this);
    this.branches = new BranchTable(this);
    this.tasks = new TaskTable(this);
    this.activity = new ActivityTable(this);
    this.users = new UserTable(this);
    
    // TO ADD NEW FEATURES: Initialize new tables here
    // this.pictures = new PictureTable(this);
  }
  
  /**
   * Get the singleton instance of the store
   */
  static getInstance(
    gitService?: GitService,
    repoPath?: string,
    username?: string
  ): CollaborationStore {
    if (!CollaborationStore.instance) {
      if (!gitService || !repoPath || !username) {
        throw new Error('CollaborationStore must be initialized with GitService, repoPath, and username');
      }
      CollaborationStore.instance = new CollaborationStore(gitService, repoPath, username);
    }
    return CollaborationStore.instance;
  }
  
  /**
   * Initialize the store and start syncing
   */
  async initialize(): Promise<void> {
    // Ensure collaboration branch exists
    await this.repository.ensureCollaborationBranch();
    
    // Do initial sync
    await this.sync();
    
    // Start periodic sync (every 60 seconds)
    this.startAutoSync();
  }
  
  /**
   * Sync with Git - pulls latest data and pushes any local changes
   */
  async sync(): Promise<void> {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      
      // Read all data from Git
      const newData = await this.repository.readAllData();
      
      // Check what changed
      const changes = this.detectChanges(this.data, newData);
      
      // Update local data
      this.data = newData;
      
      // Notify tables of changes
      if (changes.length > 0) {
        this.emit('data-changed', changes);
        
        // Emit specific events for each type of change
        changes.forEach(change => {
          this.emit(`${change.type}-changed`, change);
        });
      }
      
      this.emit('sync-complete');
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('sync-error', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Save data for the current user
   * This queues the data to be written on next sync
   */
  async saveUserData(dataType: string, data: any): Promise<void> {
    try {
      // Update local data immediately
      if (!this.data[this.currentUsername]) {
        this.data[this.currentUsername] = {};
      }
      this.data[this.currentUsername][dataType] = data;
      
      // Write to Git
      await this.repository.writeUserData(dataType, data);
      
      // Emit change event
      this.emit(`${dataType}-saved`, data);
      
    } catch (error) {
      console.error(`Failed to save ${dataType}:`, error);
      throw error;
    }
  }
  
  /**
   * Save multiple data types at once (more efficient)
   */
  async saveMultipleUserData(updates: Record<string, any>): Promise<void> {
    try {
      // Update local data
      if (!this.data[this.currentUsername]) {
        this.data[this.currentUsername] = {};
      }
      
      Object.entries(updates).forEach(([key, value]) => {
        this.data[this.currentUsername][key] = value;
      });
      
      // Write to Git in one commit
      await this.repository.writeMultipleUserData(updates);
      
      // Emit change events
      Object.keys(updates).forEach(dataType => {
        this.emit(`${dataType}-saved`, updates[dataType]);
      });
      
    } catch (error) {
      console.error('Failed to save multiple data:', error);
      throw error;
    }
  }
  
  /**
   * Get all data (used by tables)
   */
  getData(): CollaborationData {
    return this.data;
  }
  
  /**
   * Get data for a specific user
   */
  getUserData(username: string): any {
    return this.data[username] || {};
  }
  
  /**
   * Get current user's data
   */
  getMyData(): any {
    return this.getUserData(this.currentUsername);
  }
  
  /**
   * Get current username
   */
  getCurrentUsername(): string {
    return this.currentUsername;
  }
  
  /**
   * Get all usernames in the collaboration
   */
  getAllUsernames(): string[] {
    return Object.keys(this.data);
  }
  
  /**
   * Start automatic syncing
   */
  private startAutoSync(): void {
    // Sync every 60 seconds
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 60000);
  }
  
  /**
   * Stop automatic syncing
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Detect what changed between two data sets
   */
  private detectChanges(oldData: CollaborationData, newData: CollaborationData): any[] {
    const changes: any[] = [];
    
    // Check each user's data
    const allUsers = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allUsers.forEach(username => {
      const oldUserData = oldData[username] || {};
      const newUserData = newData[username] || {};
      
      // Check each data type
      const dataTypes = new Set([...Object.keys(oldUserData), ...Object.keys(newUserData)]);
      
      dataTypes.forEach(dataType => {
        const oldValue = oldUserData[dataType];
        const newValue = newUserData[dataType];
        
        // Simple comparison - could be made more sophisticated
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            username,
            type: dataType,
            oldValue,
            newValue
          });
        }
      });
    });
    
    return changes;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.removeAllListeners();
  }
}