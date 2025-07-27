import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gitAPI', {
  save: (message: string) => ipcRenderer.invoke('git:save', message),
  sync: () => ipcRenderer.invoke('git:sync'),
  push: () => ipcRenderer.invoke('git:push'),
  status: () => ipcRenderer.invoke('git:status'),
  getRepoInfo: () => ipcRenderer.invoke('repo:info'),
  selectRepo: () => ipcRenderer.invoke('repo:select'),
  openBranches: () => ipcRenderer.invoke('branches:open'),
});

contextBridge.exposeInMainWorld('licenseAPI', {
  activate: (email: string, key: string) => ipcRenderer.invoke('license:activate', email, key),
  openPurchasePage: () => ipcRenderer.invoke('license:openPurchase'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  onBranchChanged: (callback: (repo: any) => void) => {
    ipcRenderer.on('branch-changed', (_, repo) => callback(repo));
  }
});