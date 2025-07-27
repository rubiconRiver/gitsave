import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gitAPI', {
  save: (message: string) => ipcRenderer.invoke('git:save', message),
  sync: () => ipcRenderer.invoke('git:sync'),
  push: () => ipcRenderer.invoke('git:push'),
  status: () => ipcRenderer.invoke('git:status'),
  getRepoInfo: () => ipcRenderer.invoke('repo:info'),
  selectRepo: () => ipcRenderer.invoke('repo:select'),
});