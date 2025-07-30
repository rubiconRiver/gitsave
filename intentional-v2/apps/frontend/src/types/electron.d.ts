// Type definitions for Electron IPC API

interface ElectronAPI {
  invoke: (channel: string, data?: any) => Promise<any>
  send: (channel: string, data?: any) => void
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}