import { GitService } from '../services/GitService';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * COLLABORATION DATA STRUCTURE
 * 
 * This is how data is organized on the 'collaboration' Git branch.
 * Each user has their own folder, preventing conflicts.
 * 
 * Example structure:
 * collaboration/
 * ├── garett/
 * │   ├── profile.json      (user info, avatar, status)
 * │   ├── branches.json     (branch ownership info)
 * │   ├── tasks.json        (todo items, assignments)
 * │   ├── activity.json     (recent actions feed)
 * │   └── messages/
 * │       └── outbox.json   (messages sent to others)
 * └── partner/
 *     └── ... (same structure)
 * 
 * TO ADD NEW FEATURES:
 * 1. Add a new type in src/main/collaboration/types/
 * 2. Add the property below (e.g., pictures?: any[])
 * 3. Create a new table in src/main/collaboration/tables/
 * 4. The data will automatically sync via Git
 */
export interface UserCollaborationData {
  profile?: any;        // User's profile information
  branches?: any[];     // Branches they own/work on
  tasks?: any[];        // Their todo items
  messages?: {          // Messaging system
    outbox: any[],      // Messages they've sent
    drafts: any[]       // Unsent message drafts
  };
  activity?: any[];     // Activity feed items
  // TO ADD NEW FEATURES: Add new properties here
  // pictures?: any[];  // Example: Shared pictures/screenshots
  // notes?: any[];     // Example: Shared notes/documentation
  [key: string]: any;   // Allow dynamic properties
}

export interface CollaborationData {
  [username: string]: UserCollaborationData;
}

export class CollaborationRepository {
  private collaborationBranch = 'collaboration';
  private currentUsername: string;
  private isSyncing = false;
  
  constructor(
    private gitService: GitService,
    private repoPath: string,
    username: string
  ) {
    this.currentUsername = username;
  }
  
  /**
   * Read all collaboration data from the branch without checkout
   * For now, we'll use a simpler approach - switch branches temporarily
   */
  async readAllData(): Promise<CollaborationData> {
    try {
      // First, fetch latest changes
      await this.gitService.fetch();
      
      // Check if collaboration branch exists
      const branches = await this.gitService.getBranches();
      const hasCollabBranch = branches.all.includes(this.collaborationBranch) || 
                              branches.all.includes(`remotes/origin/${this.collaborationBranch}`);
      
      if (!hasCollabBranch) {
        return {};
      }
      
      // For now, use git show to read files without checkout
      const data: CollaborationData = {};
      
      try {
        // List files on collaboration branch
        const fileList = await this.gitService.raw([
          'ls-tree', 
          '-r', 
          '--name-only', 
          `origin/${this.collaborationBranch}`
        ]);
        
        const files = fileList.split('\n').filter(f => f.trim() && f.endsWith('.json'));
        
        for (const filePath of files) {
          try {
            // Read file content from branch
            const content = await this.gitService.show([
              `origin/${this.collaborationBranch}:${filePath}`
            ]);
            
            const parsed = JSON.parse(content);
            
            // Extract username and data type from path
            const parts = filePath.split('/');
            if (parts.length >= 2) {
              const username = parts[0];
              const dataType = parts[1].replace('.json', '');
              
              if (!data[username]) {
                data[username] = {};
              }
              
              if (parts[1] === 'messages' && parts[2]) {
                // Handle messages subdirectory
                if (!data[username].messages) {
                  data[username].messages = { outbox: [], drafts: [] };
                }
                const messageType = parts[2].replace('.json', '') as 'outbox' | 'drafts';
                data[username].messages[messageType] = parsed;
              } else {
                data[username][dataType] = parsed;
              }
            }
          } catch (error) {
            console.error(`Failed to read ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to list collaboration files:', error);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to read collaboration data:', error);
      return {};
    }
  }
  
  /**
   * Write data to the collaboration branch
   * We'll use a temporary directory approach
   */
  async writeUserData(dataType: string, data: any): Promise<void> {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      
      // Save current branch
      const currentBranch = await this.gitService.getCurrentBranch();
      
      // Stash any changes
      const status = await this.gitService.getStatus();
      const hasChanges = !status.isClean();
      if (hasChanges) {
        await this.gitService.stash(['push', '-m', 'Collaboration update stash']);
      }
      
      try {
        // Switch to collaboration branch (create if needed)
        const branches = await this.gitService.getBranches();
        if (branches.all.includes(this.collaborationBranch)) {
          await this.gitService.checkout(this.collaborationBranch);
        } else {
          // Create collaboration branch
          await this.gitService.checkoutBranch(this.collaborationBranch, 'HEAD');
        }
        
        // Write the file
        const filePath = path.join(this.repoPath, this.currentUsername, `${dataType}.json`);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        // Commit
        await this.gitService.add(path.join(this.currentUsername, `${dataType}.json`));
        await this.gitService.commit(`Update ${dataType} for ${this.currentUsername}`);
        
        // Push
        try {
          await this.gitService.push('origin', this.collaborationBranch);
        } catch (pushError) {
          console.error('Failed to push collaboration data:', pushError);
        }
        
      } finally {
        // Switch back to original branch
        await this.gitService.checkout(currentBranch);
        
        // Pop stash if we had changes
        if (hasChanges) {
          try {
            await this.gitService.stash(['pop']);
          } catch (e) {
            console.error('Failed to pop stash:', e);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to write collaboration data:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Write multiple data types in a single commit
   */
  async writeMultipleUserData(updates: Record<string, any>): Promise<void> {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      
      // Save current branch
      const currentBranch = await this.gitService.getCurrentBranch();
      
      // Stash any changes
      const status = await this.gitService.getStatus();
      const hasChanges = !status.isClean();
      if (hasChanges) {
        await this.gitService.stash(['push', '-m', 'Collaboration update stash']);
      }
      
      try {
        // Switch to collaboration branch
        const branches = await this.gitService.getBranches();
        if (branches.all.includes(this.collaborationBranch)) {
          await this.gitService.checkout(this.collaborationBranch);
        } else {
          await this.gitService.checkoutBranch(this.collaborationBranch, 'HEAD');
        }
        
        // Write all files
        for (const [dataType, data] of Object.entries(updates)) {
          const filePath = path.join(this.repoPath, this.currentUsername, `${dataType}.json`);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          await this.gitService.add(path.join(this.currentUsername, `${dataType}.json`));
        }
        
        // Commit all changes
        await this.gitService.commit(`Update collaboration data for ${this.currentUsername}`);
        
        // Push
        try {
          await this.gitService.push('origin', this.collaborationBranch);
        } catch (pushError) {
          console.error('Failed to push collaboration data:', pushError);
        }
        
      } finally {
        // Switch back
        await this.gitService.checkout(currentBranch);
        
        // Pop stash
        if (hasChanges) {
          try {
            await this.gitService.stash(['pop']);
          } catch (e) {
            console.error('Failed to pop stash:', e);
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to write multiple collaboration data:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Check if collaboration branch exists
   */
  async ensureCollaborationBranch(): Promise<void> {
    try {
      const branches = await this.gitService.getBranches();
      const hasRemoteBranch = branches.all.includes(`remotes/origin/${this.collaborationBranch}`);
      
      if (!hasRemoteBranch) {
        // Create the branch
        const currentBranch = await this.gitService.getCurrentBranch();
        
        await this.gitService.checkoutBranch(this.collaborationBranch, 'HEAD');
        
        // Create initial structure
        const initialFile = path.join(this.repoPath, '.gitkeep');
        await fs.writeFile(initialFile, '');
        await this.gitService.add('.gitkeep');
        await this.gitService.commit('Initialize collaboration branch');
        
        try {
          await this.gitService.push('origin', this.collaborationBranch, ['--set-upstream']);
        } catch (e) {
          console.error('Failed to push collaboration branch:', e);
        }
        
        // Switch back
        await this.gitService.checkout(currentBranch);
      }
    } catch (error) {
      console.error('Failed to ensure collaboration branch:', error);
    }
  }
}