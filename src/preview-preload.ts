import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onFileChanges: (callback: (data: any) => void) => {
    ipcRenderer.on('file-changes', (_, data) => callback(data));
  }
});