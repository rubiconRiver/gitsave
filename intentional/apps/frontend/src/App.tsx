import React, { useState } from 'react'
import './App.css'

// Type declaration for the Intentional API
declare global {
  interface Window {
    intentional?: {
      invoke: (channel: string, data?: any) => Promise<any>
      send: (channel: string, data?: any) => void
    }
  }
}

function App() {
  const [ipcMessage, setIpcMessage] = useState<string>('')
  
  const testIPC = async () => {
    if (window.intentional) {
      try {
        const result = await window.intentional.invoke('test-ipc')
        setIpcMessage(result.message)
      } catch (error) {
        setIpcMessage('IPC Error: ' + error)
      }
    } else {
      setIpcMessage('Running in browser mode - IPC not available')
    }
  }

  return (
    <div className="app-container">
      <div className="widget-bar">
        <div className="widget save-widget">
          <button className="save-button" onClick={testIPC}>
            💾 Test IPC
          </button>
          {ipcMessage && <p className="ipc-message">{ipcMessage}</p>}
        </div>
      </div>
    </div>
  )
}

export default App