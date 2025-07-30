import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { api } from '../services/api'

interface FileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  oldPath?: string // for renamed files
}

interface Intent {
  id: string
  text: string
  priority: 'high' | 'medium' | 'low'
  createdAt: Date
}

interface GitSaveState {
  // Git state
  currentBranch: string
  branches: string[]
  fileChanges: FileChange[]
  isClean: boolean
  
  // Sync state
  syncStatus: 'synced' | 'behind' | 'ahead' | 'diverged'
  behindCount: number
  aheadCount: number
  
  // Intents
  intents: Intent[]
  
  // UI state
  isSaving: boolean
  lastSaveTime?: Date
  error?: string
}

interface GitSaveContextType extends GitSaveState {
  // Actions
  save: () => Promise<void>
  switchBranch: (branch: string) => Promise<void>
  createBranch: (name: string) => Promise<void>
  undo: () => Promise<void>
  fetch: () => Promise<void>
  pull: () => Promise<void>
  push: () => Promise<void>
  
  // Intent actions
  addIntent: (text: string, priority: Intent['priority']) => void
  removeIntent: (id: string) => void
  updateIntent: (id: string, updates: Partial<Intent>) => void
  
  // Refresh data
  refreshStatus: () => Promise<void>
}

const GitSaveContext = createContext<GitSaveContextType | null>(null)

export const useGitSave = () => {
  const context = useContext(GitSaveContext)
  if (!context) {
    throw new Error('useGitSave must be used within a GitSaveProvider')
  }
  return context
}

interface GitSaveProviderProps {
  children: ReactNode
}

export const GitSaveProvider: React.FC<GitSaveProviderProps> = ({ children }) => {
  const [state, setState] = useState<GitSaveState>({
    currentBranch: 'main',
    branches: ['main'],
    fileChanges: [],
    isClean: true,
    syncStatus: 'synced',
    behindCount: 0,
    aheadCount: 0,
    intents: [],
    isSaving: false
  })

  // Update menubar when branch changes
  useEffect(() => {
    if (window.electron?.send) {
      window.electron.send('update-branch', state.currentBranch)
    }
  }, [state.currentBranch])

  // Git actions
  const save = async () => {
    setState(prev => ({ ...prev, isSaving: true, error: undefined }))
    try {
      await api.commit({ 
        message: `Save ${state.fileChanges.length} changes` 
      })
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        fileChanges: [],
        isClean: true,
        lastSaveTime: new Date()
      }))
      
      // Refresh status after save
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : 'Save failed'
      }))
    }
  }

  const switchBranch = async (branch: string) => {
    try {
      await api.switchBranch(branch)
      setState(prev => ({ ...prev, currentBranch: branch }))
      await refreshStatus()
      
      // Update menubar
      if (window.electron?.send) {
        window.electron.send('update-branch', branch)
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Branch switch failed'
      }))
    }
  }

  const createBranch = async (name: string) => {
    try {
      await api.createBranch(name)
      setState(prev => ({
        ...prev,
        branches: [...prev.branches, name],
        currentBranch: name
      }))
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Branch creation failed'
      }))
    }
  }

  const undo = async () => {
    try {
      await api.undo()
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Undo failed'
      }))
    }
  }

  const fetch = async () => {
    try {
      await api.fetch()
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Fetch failed'
      }))
    }
  }

  const pull = async () => {
    try {
      await api.pull()
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Pull failed'
      }))
    }
  }

  const push = async () => {
    try {
      await api.push()
      await refreshStatus()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Push failed'
      }))
    }
  }

  // Intent actions
  const addIntent = (text: string, priority: Intent['priority']) => {
    const newIntent: Intent = {
      id: Date.now().toString(),
      text,
      priority,
      createdAt: new Date()
    }
    setState(prev => ({
      ...prev,
      intents: [...prev.intents, newIntent]
    }))
  }

  const removeIntent = (id: string) => {
    setState(prev => ({
      ...prev,
      intents: prev.intents.filter(intent => intent.id !== id)
    }))
  }

  const updateIntent = (id: string, updates: Partial<Intent>) => {
    setState(prev => ({
      ...prev,
      intents: prev.intents.map(intent =>
        intent.id === id ? { ...intent, ...updates } : intent
      )
    }))
  }

  const refreshStatus = async () => {
    try {
      const status = await api.getStatus()
      
      setState(prev => ({
        ...prev,
        currentBranch: status.branch,
        branches: status.branches,
        fileChanges: status.changes,
        isClean: status.isClean,
        aheadCount: status.ahead,
        behindCount: status.behind,
        syncStatus: 
          status.ahead > 0 && status.behind > 0 ? 'diverged' :
          status.ahead > 0 ? 'ahead' :
          status.behind > 0 ? 'behind' : 'synced'
      }))
      
      // Update menubar with new branch if it changed
      if (window.electron?.send) {
        window.electron.send('update-branch', status.branch)
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Status refresh failed'
      }))
    }
  }

  const value: GitSaveContextType = {
    ...state,
    save,
    switchBranch,
    createBranch,
    undo,
    fetch,
    pull,
    push,
    addIntent,
    removeIntent,
    updateIntent,
    refreshStatus
  }

  return (
    <GitSaveContext.Provider value={value}>
      {children}
    </GitSaveContext.Provider>
  )
}