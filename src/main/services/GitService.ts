import simpleGit, { SimpleGit } from 'simple-git';
import { GitStatus, CommitResult, TimeTravelState } from '../types';

export class GitService {
  private git: SimpleGit | null = null;
  private repoPath: string = '';
  private timeTravelState: TimeTravelState = {
    isActive: false,
    originalBranch: '',
    hasStash: false,
    currentCommit: ''
  };

  setRepository(repoPath: string): void {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  getGit(): SimpleGit {
    if (!this.git) {
      throw new Error('Repository not initialized');
    }
    return this.git;
  }

  async checkIsRepo(): Promise<boolean> {
    try {
      return await this.getGit().checkIsRepo();
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<GitStatus> {
    return await this.getGit().status();
  }

  async getCurrentBranch(): Promise<string> {
    const branches = await this.getGit().branchLocal();
    return branches.current;
  }

  async getBranches(): Promise<any> {
    return await this.getGit().branchLocal();
  }

  async addAll(): Promise<void> {
    await this.getGit().add('.');
  }

  async commit(message: string): Promise<void> {
    await this.getGit().commit(message);
  }

  async push(remote?: string, branch?: string, options?: string[]): Promise<void> {
    if (remote && branch && options) {
      await this.getGit().push(remote, branch, options);
    } else {
      await this.getGit().push();
    }
  }

  async fetch(): Promise<void> {
    await this.getGit().fetch();
  }

  async pull(): Promise<void> {
    await this.getGit().pull();
  }

  async checkout(branchName: string): Promise<void> {
    await this.getGit().checkout(branchName);
  }

  async checkoutBranch(branchName: string, startPoint: string): Promise<void> {
    await this.getGit().checkoutBranch(branchName, startPoint);
  }

  async deleteLocalBranch(branchName: string): Promise<void> {
    await this.getGit().deleteLocalBranch(branchName);
  }

  async getConfig(key: string): Promise<any> {
    return await this.getGit().getConfig(key);
  }

  async getRemotes(verbose?: boolean): Promise<any> {
    return verbose ? await this.getGit().getRemotes(true) : await this.getGit().getRemotes();
  }

  async log(options?: any): Promise<any> {
    return await this.getGit().log(options);
  }

  async show(options: string[]): Promise<string> {
    return await this.getGit().show(options);
  }

  async raw(args: string[]): Promise<string> {
    return await this.getGit().raw(args);
  }

  async stash(options?: string[]): Promise<void> {
    await this.getGit().stash(options);
  }

  // Time travel methods
  async timeTravelTo(commitHash: string): Promise<{ success: boolean; error?: string; commit?: any; isTimeTravel?: boolean; originalBranch?: string }> {
    try {
      const git = this.getGit();
      
      // First time travel - save current state
      if (!this.timeTravelState.isActive) {
        const branches = await git.branchLocal();
        this.timeTravelState.originalBranch = branches.current;
        
        const status = await git.status();
        if (!status.isClean()) {
          await git.stash(['push', '-m', 'Intentional time-travel stash']);
          this.timeTravelState.hasStash = true;
        }
        
        this.timeTravelState.isActive = true;
      }
      
      await git.checkout(commitHash);
      this.timeTravelState.currentCommit = commitHash;
      
      const log = await git.log([commitHash, '-n', '1']);
      const commit = log.latest;
      
      if (!commit) {
        throw new Error('Commit not found');
      }
      
      return { 
        success: true,
        commit: {
          hash: commit.hash,
          message: commit.message,
          author: commit.author_name,
          date: commit.date
        },
        isTimeTravel: true,
        originalBranch: this.timeTravelState.originalBranch
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to travel to commit' };
    }
  }

  async timeTravelReturn(): Promise<{ success: boolean; error?: string }> {
    if (!this.timeTravelState.isActive) {
      return { success: false, error: 'Not in time travel mode' };
    }
    
    try {
      const git = this.getGit();
      
      await git.checkout(this.timeTravelState.originalBranch);
      
      if (this.timeTravelState.hasStash) {
        try {
          await git.stash(['pop']);
        } catch (err) {
          console.error('Failed to pop stash:', err);
        }
      }
      
      const originalBranch = this.timeTravelState.originalBranch;
      
      // Reset state
      this.timeTravelState = {
        isActive: false,
        originalBranch: '',
        hasStash: false,
        currentCommit: ''
      };
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to return from time travel' };
    }
  }

  getTimeTravelState(): TimeTravelState {
    return { ...this.timeTravelState };
  }
}