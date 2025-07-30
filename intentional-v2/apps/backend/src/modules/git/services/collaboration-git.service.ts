import { Injectable } from '@nestjs/common';
import { GitCoreService } from './git-core.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CollaborationGitService {
  private readonly COLLABORATION_BRANCH = 'collaboration';
  
  constructor(
    private gitCore: GitCoreService,
    private eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Ensure collaboration branch exists
   */
  async ensureCollaborationBranch(): Promise<void> {
    const branches = await this.gitCore.getBranches();
    
    if (!branches.includes(this.COLLABORATION_BRANCH)) {
      // Create orphan branch for collaboration
      console.log('Creating collaboration branch...');
      
      // For now, we'll need to use the git command directly
      // isomorphic-git doesn't support orphan branches easily
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const repoPath = this.gitCore.getRepoPath();
      
      try {
        // Create orphan branch
        await execAsync('git checkout --orphan collaboration', { cwd: repoPath });
        
        // Create initial structure
        const collaborationPath = path.join(repoPath, '.gitkeep');
        await fs.writeFile(collaborationPath, '');
        
        // Initial commit
        await execAsync('git add .gitkeep', { cwd: repoPath });
        await execAsync('git commit -m "Initialize collaboration branch"', { cwd: repoPath });
        
        // Push to remote
        await execAsync('git push -u origin collaboration', { cwd: repoPath });
        
        // Switch back to main/master
        const mainBranch = branches.includes('main') ? 'main' : 'master';
        await execAsync(`git checkout ${mainBranch}`, { cwd: repoPath });
        
        console.log('Collaboration branch created successfully');
      } catch (error) {
        console.error('Failed to create collaboration branch:', error);
        throw error;
      }
    }
  }
  
  /**
   * Read JSON file from collaboration branch without checkout
   */
  async readJsonFile(filePath: string): Promise<any> {
    try {
      // First fetch latest changes
      await this.gitCore.fetch();
      
      const content = await this.gitCore.readFileFromBranch(
        `origin/${this.COLLABORATION_BRANCH}`,
        filePath
      );
      
      return JSON.parse(content);
    } catch (error) {
      // File doesn't exist or branch doesn't exist remotely
      return null;
    }
  }
  
  /**
   * Write JSON file to collaboration branch
   * This uses a temporary directory approach to avoid switching branches
   */
  async writeJsonFile(filePath: string, data: any): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const os = require('os');
    
    const tempDir = path.join(os.tmpdir(), `intentional-collab-${Date.now()}`);
    
    try {
      // Clone only the collaboration branch to temp directory
      const repoPath = this.gitCore.getRepoPath();
      const remoteUrl = await this.getRemoteUrl();
      
      // Sparse clone with only collaboration branch
      await execAsync(
        `git clone --single-branch --branch ${this.COLLABORATION_BRANCH} --depth 1 ${remoteUrl} ${tempDir}`
      );
      
      // Write the file
      const fullPath = path.join(tempDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
      
      // Commit and push
      await execAsync(`git add "${filePath}"`, { cwd: tempDir });
      await execAsync(
        `git commit -m "Update ${filePath}"`,
        { cwd: tempDir }
      );
      await execAsync('git push', { cwd: tempDir });
      
      // Emit event
      this.eventEmitter.emit('collaboration.file-updated', {
        filePath,
        data,
      });
      
    } finally {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * List all user directories in collaboration branch
   */
  async listUserDirectories(): Promise<string[]> {
    try {
      const files = await this.gitCore.listFilesInBranch(
        `origin/${this.COLLABORATION_BRANCH}`,
        ''
      );
      
      // Extract unique user directories
      const users = new Set<string>();
      files.forEach(file => {
        const parts = file.split('/');
        if (parts.length > 0 && parts[0] !== '.gitkeep') {
          users.add(parts[0]);
        }
      });
      
      return Array.from(users);
    } catch {
      return [];
    }
  }
  
  /**
   * Read all data for a specific user
   */
  async readUserData(username: string): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};
    
    try {
      const files = await this.gitCore.listFilesInBranch(
        `origin/${this.COLLABORATION_BRANCH}`,
        username
      );
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const dataType = path.basename(file, '.json');
          const data = await this.readJsonFile(`${username}/${file}`);
          if (data !== null) {
            userData[dataType] = data;
          }
        }
      }
    } catch {
      // User directory doesn't exist
    }
    
    return userData;
  }
  
  /**
   * Get remote URL for cloning
   */
  private async getRemoteUrl(): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const repoPath = this.gitCore.getRepoPath();
    const { stdout } = await execAsync('git remote get-url origin', { cwd: repoPath });
    
    return stdout.trim();
  }
}