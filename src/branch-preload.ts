import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('branchAPI', {
  createBranch: (name: string) => ipcRenderer.invoke('git:createBranch', name),
  switchBranch: (name: string) => ipcRenderer.invoke('git:switchBranch', name),
  deleteBranch: (name: string) => ipcRenderer.invoke('git:deleteBranch', name),
  getBranches: () => ipcRenderer.invoke('git:getBranches'),
  fetch: () => ipcRenderer.invoke('git:sync'),
  timeTravelTo: (commitHash: string) => ipcRenderer.invoke('git:timeTravelTo', commitHash),
  timeTravelReturn: () => ipcRenderer.invoke('git:timeTravelReturn')
});

// Store initial data when preload runs
let initialData: any = null;

// Listen for initial data from main process
ipcRenderer.on('branch-window-data', (_, data) => {
  console.log('Received branch-window-data in preload:', data);
  initialData = data;
});

contextBridge.exposeInMainWorld('initialData', {
  get: () => initialData
});