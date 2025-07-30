// Git-related types
export interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  oldPath?: string // for renamed files
}

export interface GitStatus {
  branch: string
  branches: string[]
  changes: FileChange[]
  isClean: boolean
  ahead: number
  behind: number
}

export interface SaveOptions {
  message?: string
  author?: {
    name: string
    email: string
  }
}

// Intent-related types
export interface Intent {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
  completedAt?: Date
  assignee?: string
}

// Branch ownership types
export interface BranchOwnership {
  branch: string
  owner: string
  createdAt: Date
  lastActivity: Date
}

// Collaboration types
export interface UserMetadata {
  username: string
  email: string
  branches: BranchOwnership[]
  recentSaves: SaveRecord[]
  intents: Intent[]
}

export interface SaveRecord {
  id: string
  branch: string
  message: string
  filesChanged: number
  timestamp: Date
}

// IPC message types
export interface IpcRequest<T = any> {
  channel: string
  data?: T
}

export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// App state types
export type SyncStatus = 'synced' | 'behind' | 'ahead' | 'diverged'

export interface AppState {
  currentBranch: string
  branches: string[]
  fileChanges: FileChange[]
  isClean: boolean
  syncStatus: SyncStatus
  aheadCount: number
  behindCount: number
  intents: Intent[]
  isSaving: boolean
  lastSaveTime?: Date
  error?: string
}