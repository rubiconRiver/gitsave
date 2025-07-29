import { BaseTable } from './BaseTable';
import { BranchInfo } from '../types/Branch';

/**
 * BRANCH TABLE - Tracks branch ownership and status
 * 
 * This extends the basic branch ownership from the main app
 * with collaboration features like status, descriptions, etc.
 * 
 * USAGE:
 * - Register branch: await branches.register('feature-x', 'Building feature X')
 * - Update status: await branches.updateStatus('feature-x', 'review')
 * - Get active branches: const active = await branches.getActive()
 * 
 * STATUSES:
 * - active: Currently being worked on
 * - review: Ready for code review
 * - merged: Has been merged
 * - abandoned: No longer needed
 */
export class BranchTable extends BaseTable<BranchInfo> {
  
  /**
   * Register a new branch or update existing
   */
  async register(
    branchName: string,
    description?: string,
    parentBranch: string = 'main'
  ): Promise<BranchInfo> {
    const branches = this.getMyItems('branches');
    let branch = branches.find(b => b.branchName === branchName);
    
    if (!branch) {
      // Create new
      branch = {
        id: this.generateId(),
        userId: this.store.getCurrentUsername(),
        branchName,
        owner: this.store.getCurrentUsername(),
        ownerEmail: '', // TODO: Get from git config
        status: 'active',
        description,
        parentBranch,
        timestamp: this.now(),
        createdAt: this.now(),
        updatedAt: this.now()
      };
      branches.push(branch);
    } else {
      // Update existing
      branch.description = description || branch.description;
      branch.updatedAt = this.now();
    }
    
    await this.save('branches', branches);
    return branch;
  }
  
  /**
   * Get all active branches
   */
  async getActive(): Promise<BranchInfo[]> {
    const allBranches = this.getAllUsersItems('branches');
    return allBranches.filter(b => b.status === 'active');
  }
  
  /**
   * Get branches owned by a user
   */
  async getOwnedBy(username: string): Promise<BranchInfo[]> {
    const userBranches = this.getUserItems(username, 'branches');
    return userBranches;
  }
  
  /**
   * Update branch status
   */
  async updateStatus(
    branchName: string,
    status: 'active' | 'merged' | 'abandoned' | 'review'
  ): Promise<void> {
    const branches = this.getMyItems('branches');
    const branch = branches.find(b => b.branchName === branchName);
    
    if (branch) {
      branch.status = status;
      branch.updatedAt = this.now();
      await this.save('branches', branches);
    }
  }
  
  /**
   * Add metadata to branch (like JIRA ticket, PR number)
   */
  async addMetadata(
    branchName: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const branches = this.getMyItems('branches');
    const branch = branches.find(b => b.branchName === branchName);
    
    if (branch) {
      branch.metadata = { ...branch.metadata, ...metadata };
      branch.updatedAt = this.now();
      await this.save('branches', branches);
    }
  }
  
  /**
   * Update last commit info
   */
  async updateLastCommit(
    branchName: string,
    commit: { hash: string; message: string }
  ): Promise<void> {
    const branches = this.getMyItems('branches');
    const branch = branches.find(b => b.branchName === branchName);
    
    if (branch) {
      branch.lastCommit = {
        ...commit,
        timestamp: this.now()
      };
      branch.updatedAt = this.now();
      await this.save('branches', branches);
    }
  }
  
  /**
   * Get branches ready for review
   */
  async getReadyForReview(): Promise<BranchInfo[]> {
    const allBranches = this.getAllUsersItems('branches');
    return allBranches.filter(b => b.status === 'review');
  }
  
  /**
   * Get branch info by name
   */
  async getByName(branchName: string): Promise<BranchInfo | undefined> {
    const allBranches = this.getAllUsersItems('branches');
    return allBranches.find(b => b.branchName === branchName);
  }
}