import * as path from 'path';
import * as fs from 'fs/promises';
import { BranchOwnership } from '../types';
import { GitService } from './GitService';

export class BranchService {
  constructor(private gitService: GitService) {}

  async getBranchOwnershipPath(repoPath: string): Promise<string> {
    return path.join(repoPath, 'intentional.dev', 'branches', 'ownership.json');
  }

  async ensureBranchesDirectory(repoPath: string): Promise<void> {
    const branchesDir = path.join(repoPath, 'intentional.dev', 'branches');
    try {
      await fs.mkdir(branchesDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create branches directory:', error);
    }
  }

  async loadBranchOwnership(repoPath: string): Promise<BranchOwnership> {
    try {
      const filePath = await this.getBranchOwnershipPath(repoPath);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return { branches: {} };
    }
  }

  async saveBranchOwnership(repoPath: string, ownership: BranchOwnership): Promise<void> {
    try {
      await this.ensureBranchesDirectory(repoPath);
      const filePath = await this.getBranchOwnershipPath(repoPath);
      await fs.writeFile(filePath, JSON.stringify(ownership, null, 2));
    } catch (error) {
      console.error('Failed to save branch ownership:', error);
    }
  }

  async recordBranchOwner(repoPath: string, branchName: string, owner: string, email: string): Promise<void> {
    const ownership = await this.loadBranchOwnership(repoPath);
    ownership.branches[branchName] = {
      owner,
      email,
      createdAt: new Date().toISOString()
    };
    await this.saveBranchOwnership(repoPath, ownership);
  }

  async getBranchOwner(repoPath: string, branchName: string): Promise<{ owner: string | null; email: string | null }> {
    try {
      // First check our ownership file
      const ownership = await this.loadBranchOwnership(repoPath);
      if (ownership.branches[branchName]) {
        return {
          owner: ownership.branches[branchName].owner,
          email: ownership.branches[branchName].email
        };
      }
      
      // If not in file, check git history (for existing branches)
      try {
        const mergeBase = await this.gitService.raw(['merge-base', 'main', branchName]);
        const baseCommit = mergeBase.trim();
        
        const branchCommits = await this.gitService.raw(['rev-list', `${baseCommit}..${branchName}`, '--reverse']);
        const firstUniqueCommit = branchCommits.split('\n')[0]?.trim();
        
        if (firstUniqueCommit) {
          const commitInfo = await this.gitService.show([firstUniqueCommit, '--format=%an%n%ae', '--no-patch']);
          const [author, email] = commitInfo.split('\n');
          
          // Save this info for future reference
          await this.recordBranchOwner(repoPath, branchName, author, email);
          
          return { owner: author, email: email };
        }
      } catch (gitError) {
        console.log('Could not determine branch owner from git history:', gitError);
      }
      
      return { owner: null, email: null };
    } catch (error: any) {
      console.error('Failed to get branch owner:', error);
      return { owner: null, email: null };
    }
  }

  async loadTeamBranches(repoPath: string): Promise<{ teamBranches: string[], teamBranchPrefixes: string[] }> {
    try {
      const filePath = path.join(repoPath, 'intentional.dev', 'branches', 'team-branches.json');
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid, return defaults
      return {
        teamBranches: ['main', 'master'],
        teamBranchPrefixes: ['release/', 'hotfix/']
      };
    }
  }

  async getAllBranchDetails(repoPath: string): Promise<any[]> {
    const branches = await this.gitService.getBranches();
    const branchDetails = [];
    
    for (const branch of branches.all) {
      try {
        const branchLog = await this.gitService.log([branch, '-n', '1']);
        const lastCommit = branchLog.latest;
        branchDetails.push({
          name: branch,
          lastCommit: lastCommit ? {
            hash: lastCommit.hash,
            message: lastCommit.message,
            author: lastCommit.author_name,
            email: lastCommit.author_email,
            date: lastCommit.date
          } : null
        });
      } catch (err) {
        console.error(`Failed to get details for branch ${branch}:`, err);
      }
    }
    
    return branchDetails;
  }
}