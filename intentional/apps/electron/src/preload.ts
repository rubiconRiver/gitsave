import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('intentional', {
  // Two-way communication (expects response)
  invoke: (channel: string, data?: any) => {
    const validChannels = ['test-ipc', 'git-status', 'git-save', 'git-branch']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    throw new Error(`Invalid channel: ${channel}`)
  },
  
  // One-way communication (fire and forget)
  send: (channel: string, data?: any) => {
    const validChannels = ['update-branch']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    } else {
      throw new Error(`Invalid channel: ${channel}`)
    }
  }
})