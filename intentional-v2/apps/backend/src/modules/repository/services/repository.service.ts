import { Injectable } from '@nestjs/common';
import { GitCoreService } from '../../git/services/git-core.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface RepositoryInfo {
  path: string;
  name: string;
  currentBranch: string;
  isClean: boolean;
  remoteUrl?: string;
}

@Injectable()
export class RepositoryService {
  private currentRepo: RepositoryInfo | null = null;
  
  constructor(
    private gitCore: GitCoreService,
    private eventEmitter: EventEmitter2,
  ) {}
  
  /**
   * Load a repository
   */
  async loadRepository(repoPath: string): Promise<RepositoryInfo> {
    // Verify it's a valid repository
    this.gitCore.setRepository(repoPath);
    
    const isRepo = await this.gitCore.isRepository();
    if (!isRepo) {
      throw new Error('Not a valid Git repository');
    }
    
    // Get repository info
    const name = path.basename(repoPath);
    const currentBranch = await this.gitCore.getCurrentBranch();
    const status = await this.gitCore.getStatus();
    
    // Check if clean (no modified files)
    const isClean = status.every(([filepath, head, workdir, stage]) => {
      return head === 1 && workdir === 1 && stage === 1;
    });
    
    this.currentRepo = {
      path: repoPath,
      name,
      currentBranch,
      isClean,
    };
    
    // Emit repository loaded event
    this.eventEmitter.emit('repository.loaded', this.currentRepo);
    
    return this.currentRepo;
  }
  
  /**
   * Get current repository info
   */
  getCurrentRepo(): RepositoryInfo | null {
    return this.currentRepo;
  }
  
  /**
   * Get repository status
   */
  async getStatus() {
    if (!this.currentRepo) {
      throw new Error('No repository loaded');
    }
    
    const statusMatrix = await this.gitCore.getStatus();
    
    // Convert status matrix to more readable format
    const files = statusMatrix.map(([filepath, head, workdir, stage]) => {
      let status = 'unmodified';
      
      if (head === 0 && workdir === 2) {
        status = 'new';
      } else if (head === 1 && workdir === 0) {
        status = 'deleted';
      } else if (head === 1 && workdir === 2) {
        status = 'modified';
      }
      
      return {
        path: filepath,
        status,
        staged: stage === 2 || stage === 3,
      };
    });
    
    // Filter out unmodified files
    const changedFiles = files.filter(f => f.status !== 'unmodified');
    
    return {
      branch: await this.gitCore.getCurrentBranch(),
      isClean: changedFiles.length === 0,
      files: changedFiles,
    };
  }
  
  /**
   * Stage all changes
   */
  async stageAll(): Promise<void> {
    if (!this.currentRepo) {
      throw new Error('No repository loaded');
    }
    
    const status = await this.gitCore.getStatus();
    const filesToStage = status
      .filter(([filepath, head, workdir]) => workdir === 2)
      .map(([filepath]) => filepath);
    
    await this.gitCore.stageFiles(filesToStage);
    
    this.eventEmitter.emit('repository.files-staged', filesToStage);
  }
  
  /**
   * Create a commit
   */
  async commit(message: string, author?: { name: string; email: string }): Promise<string> {
    if (!this.currentRepo) {
      throw new Error('No repository loaded');
    }
    
    // Use default author if not provided
    const commitAuthor = author || {
      name: 'Intentional User',
      email: 'user@intentional.app',
    };
    
    const sha = await this.gitCore.commit(message, commitAuthor);
    
    this.eventEmitter.emit('repository.commit-created', {
      sha,
      message,
      author: commitAuthor,
    });
    
    return sha;
  }
  
  /**
   * Get commit history
   */
  async getHistory(limit: number = 50): Promise<any[]> {
    if (!this.currentRepo) {
      throw new Error('No repository loaded');
    }
    
    return this.gitCore.getLog(limit);
  }
  
  /**
   * Switch branch
   */
  async switchBranch(branchName: string): Promise<void> {
    if (!this.currentRepo) {
      throw new Error('No repository loaded');
    }
    
    // Check if we have uncommitted changes
    const status = await this.getStatus();
    if (!status.isClean) {
      throw new Error('Cannot switch branches with uncommitted changes');
    }
    
    // For now, use git command directly
    // isomorphic-git checkout is limited
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    await execAsync(`git checkout ${branchName}`, {
      cwd: this.currentRepo.path,
    });
    
    this.currentRepo.currentBranch = branchName;
    
    this.eventEmitter.emit('repository.branch-changed', {
      oldBranch: this.currentRepo.currentBranch,
      newBranch: branchName,
    });
  }
}