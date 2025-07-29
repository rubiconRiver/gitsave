// Common types used across services

export interface RepoInfo {
  path: string;
  name: string;
  branch: string;
}

export interface GitStatus {
  files: any[];
  modified: string[];
  created: string[];
  deleted: string[];
  renamed: any[]; // StatusResultRenamed[] from simple-git
  isClean: () => boolean;
}

export interface CommitResult {
  success?: boolean;
  error?: string;
  warning?: string;
  pushed?: boolean;
  pushError?: string;
  needsConfirmation?: boolean;
  branchOwner?: string;
  branchOwnerEmail?: string;
  currentBranch?: string;
  message?: string;
}

export interface BranchOwnership {
  branches: {
    [branchName: string]: {
      owner: string;
      email: string;
      createdAt: string;
    }
  }
}

export interface TimeTravelState {
  isActive: boolean;
  originalBranch: string;
  hasStash: boolean;
  currentCommit: string;
}