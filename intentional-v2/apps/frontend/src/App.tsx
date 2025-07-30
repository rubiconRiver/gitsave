import React, { useEffect } from 'react'
import { ConfigProvider } from '@arco-design/web-react'
import { WidgetBar, SaveWidget } from './components'
import { GitSaveProvider, useGitSave } from './context/GitSaveContext'
import './App.css'

function AppContent() {
  const { fileChanges, save, isSaving, refreshStatus } = useGitSave()
  
  useEffect(() => {
    // Initial load - get current git status
    refreshStatus()
  }, [])
  
  return (
    <div className="app-container">
      <WidgetBar>
        <SaveWidget 
          changeCount={fileChanges.length}
          onSave={save}
          disabled={isSaving}
        />
      </WidgetBar>
    </div>
  )
}

function App() {
  return (
    <ConfigProvider theme="dark">
      <GitSaveProvider>
        <AppContent />
      </GitSaveProvider>
    </ConfigProvider>
  )
}

export default App