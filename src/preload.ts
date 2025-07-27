import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gitAPI', {
  save: (message: string, forceCommit?: boolean) => ipcRenderer.invoke('git:save', message, forceCommit),
  sync: () => ipcRenderer.invoke('git:sync'),
  push: () => ipcRenderer.invoke('git:push'),
  status: () => ipcRenderer.invoke('git:status'),
  checkAuth: () => ipcRenderer.invoke('git:checkAuth'),
  getBranchOwner: (branch: string) => ipcRenderer.invoke('git:getBranchOwner', branch),
  claimBranch: (branch: string) => ipcRenderer.invoke('git:claimBranch', branch),
  getRepoInfo: () => ipcRenderer.invoke('repo:info'),
  selectRepo: () => ipcRenderer.invoke('repo:select'),
  openBranches: () => ipcRenderer.invoke('branches:open'),
  showChanges: () => ipcRenderer.invoke('changes:preview'),
  quit: () => ipcRenderer.invoke('app:quit'),
});

contextBridge.exposeInMainWorld('licenseAPI', {
  activate: (email: string, key: string) => ipcRenderer.invoke('license:activate', email, key),
  openPurchasePage: () => ipcRenderer.invoke('license:openPurchase'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  onBranchChanged: (callback: (repo: any) => void) => {
    ipcRenderer.on('branch-changed', (_, repo) => callback(repo));
  },
  onRepoLoaded: (callback: (repo: any) => void) => {
    ipcRenderer.on('repo-loaded', (_, repo) => callback(repo));
  },
  onGitStatusChanged: (callback: (statusInfo: any) => void) => {
    ipcRenderer.on('git-status-changed', (_, statusInfo) => callback(statusInfo));
  }
});