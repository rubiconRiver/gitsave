import { app, ipcMain } from 'electron'
import * as path from 'path'
import { menubar } from 'menubar'
import { setupIpcHandlers } from './ipc-handlers'

let mb: any = null

app.whenReady().then(async () => {
  // Set up IPC handlers (which initializes Nest.js)
  await setupIpcHandlers()
  
  // Create menubar app
  mb = menubar({
    index: process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../frontend/dist/index.html')}`,
    browserWindow: {
      width: 800,
      height: 100,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    },
    // Start with a default title
    tooltip: 'GitSave',
    showDockIcon: false,
    showOnAllWorkspaces: false
  })

  mb.on('ready', () => {
    console.log('Menubar app is ready')
    
    // Set initial tray title
    mb.tray.setTitle('🌳 main')
    
    // Open dev tools in development
    if (process.env.NODE_ENV === 'development') {
      mb.window?.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Handle branch updates from renderer
  ipcMain.on('update-branch', (event, branchName: string) => {
    if (mb && mb.tray) {
      mb.tray.setTitle(`🌳 ${branchName}`)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})