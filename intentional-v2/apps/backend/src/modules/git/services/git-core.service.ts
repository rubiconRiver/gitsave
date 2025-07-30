import { Injectable } from '@nestjs/common';
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class GitCoreService {
  private repoPath: string = '';
  
  constructor(private eventEmitter: EventEmitter2) {}
  
  /**
   * Set the repository path
   */
  setRepository(repoPath: string) {
    this.repoPath = repoPath;
  }
  
  /**
   * Get current repository path
   */
  getRepoPath(): string {
    return this.repoPath;
  }
  
  /**
   * Check if current directory is a git repository
   */
  async isRepository(): Promise<boolean> {
    try {
      await git.findRoot({ fs, filepath: this.repoPath });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    return await git.currentBranch({
      fs,
      dir: this.repoPath,
    });
  }
  
  /**
   * Get list of branches
   */
  async getBranches(): Promise<string[]> {
    return await git.listBranches({
      fs,
      dir: this.repoPath,
    });
  }
  
  /**
   * Get repository status
   */
  async getStatus(): Promise<any[]> {
    return await git.statusMatrix({
      fs,
      dir: this.repoPath,
    });
  }
  
  /**
   * Read file from specific branch without checkout
   */
  async readFileFromBranch(branch: string, filePath: string): Promise<string> {
    const oid = await git.resolveRef({
      fs,
      dir: this.repoPath,
      ref: branch,
    });
    
    const { blob } = await git.readBlob({
      fs,
      dir: this.repoPath,
      oid,
      filepath: filePath,
    });
    
    return Buffer.from(blob).toString('utf8');
  }
  
  /**
   * List files in directory on specific branch
   */
  async listFilesInBranch(branch: string, directory: string = ''): Promise<string[]> {
    const oid = await git.resolveRef({
      fs,
      dir: this.repoPath,
      ref: branch,
    });
    
    const tree = await git.readTree({
      fs,
      dir: this.repoPath,
      oid,
      filepath: directory,
    });
    
    return tree.tree.map(entry => entry.path);
  }
  
  /**
   * Stage files for commit
   */
  async stageFiles(filepaths: string[]): Promise<void> {
    for (const filepath of filepaths) {
      await git.add({
        fs,
        dir: this.repoPath,
        filepath,
      });
    }
  }
  
  /**
   * Create a commit
   */
  async commit(message: string, author: { name: string; email: string }): Promise<string> {
    const sha = await git.commit({
      fs,
      dir: this.repoPath,
      message,
      author,
    });
    
    this.eventEmitter.emit('git.commit', {
      sha,
      message,
      author,
      branch: await this.getCurrentBranch(),
    });
    
    return sha;
  }
  
  /**
   * Push to remote
   */
  async push(remote: string = 'origin', branch?: string): Promise<void> {
    const currentBranch = branch || await this.getCurrentBranch();
    
    await git.push({
      fs,
      http: require('isomorphic-git/http/node'),
      dir: this.repoPath,
      remote,
      ref: currentBranch,
    });
    
    this.eventEmitter.emit('git.push', {
      remote,
      branch: currentBranch,
    });
  }
  
  /**
   * Pull from remote
   */
  async pull(remote: string = 'origin', branch?: string): Promise<void> {
    const currentBranch = branch || await this.getCurrentBranch();
    
    await git.pull({
      fs,
      http: require('isomorphic-git/http/node'),
      dir: this.repoPath,
      ref: currentBranch,
      singleBranch: true,
    });
    
    this.eventEmitter.emit('git.pull', {
      remote,
      branch: currentBranch,
    });
  }
  
  /**
   * Fetch from remote
   */
  async fetch(remote: string = 'origin'): Promise<void> {
    await git.fetch({
      fs,
      http: require('isomorphic-git/http/node'),
      dir: this.repoPath,
      remote,
    });
    
    this.eventEmitter.emit('git.fetch', { remote });
  }
  
  /**
   * Get commit log
   */
  async getLog(depth: number = 50): Promise<any[]> {
    return await git.log({
      fs,
      dir: this.repoPath,
      depth,
    });
  }
}