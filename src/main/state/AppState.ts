import { RepoInfo, GitStatus, BranchOwnership, TimeTravelState } from '../types';

export interface CollaborationData {
  username: string;
  email: string;
  lastUpdated: string;
  tasks: any[];
  goals: any[];
  builds: any[];
  updates: any[];
}

export interface TeamMember {
  username: string;
  data: CollaborationData;
  lastSeen: string;
}

export interface BranchInfo {
  name: string;
  current: boolean;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    email: string;
    date: string;
  };
  owner?: string;
  ownerEmail?: string;
}

export interface AppState {
  // Repository state
  currentRepo: RepoInfo;
  isValidRepo: boolean;
  
  // Git state
  gitStatus: GitStatus | null;
  branches: BranchInfo[];
  currentBranch: string;
  branchOwnership: BranchOwnership;
  teamBranches: string[];
  teamBranchPrefixes: string[];
  hasUnpushedCommits: boolean;
  hasRemoteChanges: boolean;
  
  // Time travel state
  timeTravelState: TimeTravelState;
  
  // Collaboration state
  userCollabData: CollaborationData;
  teamMembers: TeamMember[];
  collaborationBranch: string; // The branch where collaboration data lives
  lastCollabSync: Date | null;
  
  // UI state
  hasFileChanges: boolean;
  filesChanged: number;
  modifiedCount: number;
  createdCount: number;
  deletedCount: number;
  renamedCount: number;
  
  // Auth state
  gitConfigured: boolean;
  userName: string;
  userEmail: string;
  hasRemotes: boolean;
  
  // App state
  isLicensed: boolean;
  isSyncing: boolean;
  lastError: string | null;
}

export const initialAppState: AppState = {
  // Repository state
  currentRepo: {
    path: '',
    name: 'No Project',
    branch: 'main'
  },
  isValidRepo: false,
  
  // Git state
  gitStatus: null,
  branches: [],
  currentBranch: 'main',
  branchOwnership: { branches: {} },
  teamBranches: ['main', 'master'],
  teamBranchPrefixes: ['release/', 'hotfix/'],
  hasUnpushedCommits: false,
  hasRemoteChanges: false,
  
  // Time travel state
  timeTravelState: {
    isActive: false,
    originalBranch: '',
    hasStash: false,
    currentCommit: ''
  },
  
  // Collaboration state
  userCollabData: {
    username: 'garett',
    email: '',
    lastUpdated: new Date().toISOString(),
    tasks: [],
    goals: [],
    builds: [],
    updates: []
  },
  teamMembers: [],
  collaborationBranch: 'collaboration',
  lastCollabSync: null,
  
  // UI state
  hasFileChanges: false,
  filesChanged: 0,
  modifiedCount: 0,
  createdCount: 0,
  deletedCount: 0,
  renamedCount: 0,
  
  // Auth state
  gitConfigured: false,
  userName: '',
  userEmail: '',
  hasRemotes: false,
  
  // App state
  isLicensed: true, // Temporarily bypassed
  isSyncing: false,
  lastError: null
};