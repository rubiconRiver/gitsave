import { CollaborationStore } from '../CollaborationStore';
import { v4 as uuidv4 } from 'uuid';

/**
 * BASE TABLE CLASS
 * 
 * All table classes extend this base class.
 * It provides common functionality like:
 * - Access to the store
 * - ID generation
 * - Timestamp helpers
 * - Save functionality
 * 
 * TO CREATE A NEW TABLE:
 * 1. Extend this class
 * 2. Implement your specific methods
 * 3. Use this.store to access data
 * 4. Use this.save() to persist changes
 */
export abstract class BaseTable<T> {
  constructor(protected store: CollaborationStore) {}
  
  /**
   * Generate a unique ID for new items
   */
  protected generateId(): string {
    return uuidv4();
  }
  
  /**
   * Get current timestamp
   */
  protected now(): string {
    return new Date().toISOString();
  }
  
  /**
   * Save data for the current user
   */
  protected async save(dataType: string, data: any): Promise<void> {
    await this.store.saveUserData(dataType, data);
  }
  
  /**
   * Get all data of a specific type for a user
   */
  protected getUserItems(username: string, dataType: string): T[] {
    const userData = this.store.getUserData(username);
    return userData[dataType] || [];
  }
  
  /**
   * Get current user's items
   */
  protected getMyItems(dataType: string): T[] {
    return this.getUserItems(this.store.getCurrentUsername(), dataType);
  }
  
  /**
   * Get all items from all users
   */
  protected getAllUsersItems(dataType: string): Array<T & { userId: string }> {
    const allItems: Array<T & { userId: string }> = [];
    
    this.store.getAllUsernames().forEach(username => {
      const items = this.getUserItems(username, dataType);
      items.forEach(item => {
        allItems.push({ ...item, userId: username });
      });
    });
    
    return allItems;
  }
}