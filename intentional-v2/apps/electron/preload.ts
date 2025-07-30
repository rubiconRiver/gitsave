import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, data?: any) => {
    // Whitelist channels that are allowed
    const validChannels = ['api-request']
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data)
    }
    throw new Error(`Invalid channel: ${channel}`)
  },
  send: (channel: string, data?: any) => {
    // Whitelist channels that are allowed
    const validChannels = ['update-branch']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    } else {
      throw new Error(`Invalid channel: ${channel}`)
    }
  }
})