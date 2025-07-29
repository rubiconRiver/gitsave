import { EventEmitter } from 'events';
import { AppState, initialAppState, CollaborationData, TeamMember } from './AppState';
import { GitService } from '../services/GitService';
import { BranchService } from '../services/BranchService';
import { FileService } from '../services/FileService';
import Store from 'electron-store';
import * as path from 'path';

export type StateUpdateEvent = 
  | 'repo-changed'
  | 'branch-changed'
  | 'git-status-changed'
  | 'branches-updated'
  | 'collaboration-updated'
  | 'team-members-updated'
  | 'auth-changed'
  | 'sync-status-changed'
  | 'error';

export class StateManager extends EventEmitter {
  private state: AppState;
  private store: Store;
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    private gitService: GitService,
    private branchService: BranchService,
    private fileService: FileService
  ) {
    super();
    this.store = new Store();
    this.state = { ...initialAppState };
    this.loadPersistedState();
  }
  
  private loadPersistedState(): void {
    this.state.currentRepo = {
      path: this.store.get('lastRepoPath', '') as string,
      name: this.store.get('lastRepoName', 'No Project') as string,
      branch: this.store.get('lastRepoBranch', 'main') as string
    };
  }
  
  getState(): Readonly<AppState> {
    return { ...this.state };
  }
  
  getStateValue<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }
  
  private setState(updates: Partial<AppState>, events?: StateUpdateEvent[]): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Emit specific events
    if (events) {
      events.forEach(event => {
        this.emit(event, this.state, oldState);
      });
    }
    
    // Always emit a general state change
    this.emit('state-changed', this.state, oldState);
  }
  
  // Repository management
  async loadRepository(repoPath: string): Promise<boolean> {
    try {
      this.gitService.setRepository(repoPath);
      const isRepo = await this.gitService.checkIsRepo();
      
      if (isRepo) {
        const branch = await this.gitService.getBranches();
        const repoName = path.basename(repoPath);
        
        // Update persistent storage
        this.store.set('lastRepoPath', repoPath);
        this.store.set('lastRepoName', repoName);
        this.store.set('lastRepoBranch', branch.current);
        
        this.setState({
          currentRepo: {
            path: repoPath,
            name: repoName,
            branch: branch.current
          },
          currentBranch: branch.current,
          isValidRepo: true
        }, ['repo-changed', 'branch-changed']);
        
        // Start monitoring
        this.startMonitoring();
        
        // Initial data fetch
        await Promise.all([
          this.updateGitStatus(),
          this.updateBranches(),
          this.updateAuthStatus(),
          this.updateCollaborationData()
        ]);
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Failed to load repository:', error);
      this.setState({ lastError: error.message || 'Unknown error' }, ['error']);
      return false;
    }
  }
  
  // Branch management
  async changeBranch(branchName: string): Promise<void> {
    const oldBranch = this.state.currentBranch;
    
    this.setState({
      currentBranch: branchName,
      currentRepo: { ...this.state.currentRepo, branch: branchName }
    }, ['branch-changed']);
    
    this.store.set('lastRepoBranch', branchName);
    
    // Update git status after branch change
    await this.updateGitStatus();
    
    // If switching to/from collaboration branch, update collaboration data
    if (branchName === this.state.collaborationBranch || oldBranch === this.state.collaborationBranch) {
      await this.updateCollaborationData();
    }
  }
  
  // Git status updates
  async updateGitStatus(): Promise<void> {
    if (!this.state.currentRepo.path) return;
    
    try {
      const status = await this.gitService.getStatus();
      const hasChanges = status.files.length > 0;
      
      this.setState({
        gitStatus: status,
        hasFileChanges: hasChanges,
        filesChanged: status.files.length,
        modifiedCount: status.modified.length,
        createdCount: status.created.length,
        deletedCount: status.deleted.length,
        renamedCount: status.renamed.length
      }, ['git-status-changed']);
    } catch (error) {
      console.error('Failed to update git status:', error);
    }
  }
  
  // Branch updates
  async updateBranches(): Promise<void> {
    if (!this.state.currentRepo.path) return;
    
    try {
      const branches = await this.gitService.getBranches();
      const branchDetails = await this.branchService.getAllBranchDetails(this.state.currentRepo.path);
      const ownership = await this.branchService.loadBranchOwnership(this.state.currentRepo.path);
      const teamConfig = await this.branchService.loadTeamBranches(this.state.currentRepo.path);
      
      // Map branch details with ownership
      const branchInfos = branchDetails.map(branch => ({
        ...branch,
        current: branch.name === branches.current,
        owner: ownership.branches[branch.name]?.owner,
        ownerEmail: ownership.branches[branch.name]?.email
      }));
      
      this.setState({
        branches: branchInfos,
        branchOwnership: ownership,
        teamBranches: teamConfig.teamBranches,
        teamBranchPrefixes: teamConfig.teamBranchPrefixes
      }, ['branches-updated']);
    } catch (error) {
      console.error('Failed to update branches:', error);
    }
  }
  
  // Collaboration updates
  async updateCollaborationData(): Promise<void> {
    if (!this.state.currentRepo.path) return;
    
    try {
      // Read user's collaboration data
      const collabPath = path.join(
        this.state.currentRepo.path, 
        'intentional.dev', 
        'collaboration', 
        `${this.state.userCollabData.username}.json`
      );
      
      const userData = await this.fileService.readJsonFile<CollaborationData>(collabPath);
      if (userData) {
        this.setState({ userCollabData: userData }, ['collaboration-updated']);
      }
      
      // If on collaboration branch, read team members' data
      if (this.state.currentBranch === this.state.collaborationBranch) {
        await this.updateTeamMembers();
      }
    } catch (error) {
      console.error('Failed to update collaboration data:', error);
    }
  }
  
  async updateTeamMembers(): Promise<void> {
    if (!this.state.currentRepo.path) return;
    
    try {
      const collabDir = path.join(this.state.currentRepo.path, 'intentional.dev', 'collaboration');
      const files = await this.fileService.readdir(collabDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== `${this.state.userCollabData.username}.json`);
      
      const teamMembers: TeamMember[] = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(collabDir, file);
        const data = await this.fileService.readJsonFile<CollaborationData>(filePath);
        if (data) {
          teamMembers.push({
            username: file.replace('.json', ''),
            data,
            lastSeen: data.lastUpdated
          });
        }
      }
      
      this.setState({ 
        teamMembers,
        lastCollabSync: new Date()
      }, ['team-members-updated']);
    } catch (error) {
      console.error('Failed to update team members:', error);
    }
  }
  
  // Auth status
  async updateAuthStatus(): Promise<void> {
    if (!this.state.currentRepo.path) return;
    
    try {
      const [userName, userEmail] = await Promise.all([
        this.gitService.getConfig('user.name'),
        this.gitService.getConfig('user.email')
      ]);
      
      const remotes = await this.gitService.getRemotes(true);
      
      this.setState({
        gitConfigured: !!(userName.value && userEmail.value),
        userName: userName.value || '',
        userEmail: userEmail.value || '',
        hasRemotes: remotes.length > 0
      }, ['auth-changed']);
    } catch (error) {
      console.error('Failed to update auth status:', error);
    }
  }
  
  // Save collaboration data
  async saveCollaborationData(data: Partial<CollaborationData>): Promise<void> {
    const updatedData = {
      ...this.state.userCollabData,
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    const collabPath = path.join(
      this.state.currentRepo.path,
      'intentional.dev',
      'collaboration',
      `${this.state.userCollabData.username}.json`
    );
    
    await this.fileService.ensureDirectory(path.dirname(collabPath));
    await this.fileService.writeJsonFile(collabPath, updatedData);
    
    this.setState({ userCollabData: updatedData }, ['collaboration-updated']);
    
    // Auto-commit if on collaboration branch
    if (this.state.currentBranch === this.state.collaborationBranch) {
      await this.gitService.addAll();
      await this.gitService.commit('Update collaboration data');
    }
  }
  
  // Monitoring
  private startMonitoring(): void {
    this.stopMonitoring();
    
    // Git status monitoring (every 2 seconds)
    this.updateTimers.set('git-status', setInterval(() => {
      this.updateGitStatus();
    }, 2000));
    
    // Branch monitoring (every 5 seconds)
    this.updateTimers.set('branches', setInterval(() => {
      this.updateBranches();
    }, 5000));
    
    // Collaboration monitoring (every 10 seconds if on collaboration branch)
    this.updateTimers.set('collaboration', setInterval(() => {
      if (this.state.currentBranch === this.state.collaborationBranch) {
        this.updateTeamMembers();
      }
    }, 10000));
  }
  
  private stopMonitoring(): void {
    this.updateTimers.forEach(timer => clearInterval(timer));
    this.updateTimers.clear();
  }
  
  // Sync operations
  async sync(): Promise<void> {
    this.setState({ isSyncing: true }, ['sync-status-changed']);
    
    try {
      await this.gitService.fetch();
      await this.gitService.pull();
      
      // Update all data after sync
      await Promise.all([
        this.updateGitStatus(),
        this.updateBranches(),
        this.updateCollaborationData()
      ]);
      
      this.setState({ isSyncing: false }, ['sync-status-changed']);
    } catch (error: any) {
      this.setState({ 
        isSyncing: false,
        lastError: error.message || 'Unknown error'
      }, ['sync-status-changed', 'error']);
      throw error;
    }
  }
  
  // Cleanup
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}