import { menubar } from 'menubar';
import { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } from 'electron';
import * as path from 'path';
import simpleGit from 'simple-git';
import Store from 'electron-store';
import { LicenseManager } from './license';

const store = new Store();
const mb = menubar({
  index: `file://${path.join(__dirname, '..', 'src', 'index.html')}`,
  browserWindow: {
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  },
  preloadWindow: true,
  showDockIcon: false,
  tooltip: 'GitSave',
  icon: path.join(__dirname, '..', 'assets', 'icon.png')
});

// Track current repo info
let currentRepo = {
  path: '',
  name: 'No Project',
  branch: 'main'
};

mb.on('ready', async () => {
  console.log('GitSave is ready!');
  
  // Check license
  if (!LicenseManager.isLicensed()) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'GitSave - License Required',
      message: 'Please enter your license key to activate GitSave',
      buttons: ['Enter License', 'Buy License', 'Dev Mode', 'Quit']
    });
    
    if (result.response === 0) {
      // Show license dialog
      mb.window?.loadFile(path.join(__dirname, '..', 'src', 'license.html'));
    } else if (result.response === 1) {
      // Open purchase page
      require('electron').shell.openExternal('https://gitsave.app/buy');
      app.quit();
    } else if (result.response === 2) {
      // Dev mode - skip license check
      console.log('Running in dev mode - license bypassed');
      // Continue normal startup
    } else {
      app.quit();
      return;
    }
    
    if (result.response !== 2) {
      return;
    }
  }
  
  // Update tray title and git info periodically
  updateTrayTitle();
  updateGitInfo();
  setInterval(() => {
    updateTrayTitle();
    updateGitInfo();
  }, 2000); // Check every 2 seconds
});

mb.on('after-create-window', () => {
  // Enable dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mb.window?.webContents.openDevTools({ mode: 'detach' });
  }
});

function updateTrayTitle() {
  if (mb.tray) {
    mb.tray.setTitle(`${currentRepo.name}/${currentRepo.branch}`);
  }
}

async function updateGitInfo() {
  if (!currentRepo.path) return;
  
  try {
    const git = simpleGit(currentRepo.path);
    const branchInfo = await git.branchLocal();
    
    if (branchInfo.current !== currentRepo.branch) {
      currentRepo.branch = branchInfo.current;
      
      // Notify the renderer window about branch change
      if (mb.window) {
        mb.window.webContents.send('branch-changed', currentRepo);
      }
    }
  } catch (error) {
    console.error('Failed to update git info:', error);
  }
}

// IPC handlers for Git operations
ipcMain.handle('git:status', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    const status = await git.status();
    return { status };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('git:save', async (_, message: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    await git.add('.');
    await git.commit(message || 'WIP');
    await git.push();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('git:sync', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    await git.fetch();
    await git.pull();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('git:push', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    await git.push();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('repo:info', async () => {
  return currentRepo;
});

ipcMain.handle('repo:select', async () => {
  const { dialog } = require('electron') as typeof import('electron');
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    try {
      const git = simpleGit(repoPath);
      const isRepo = await git.checkIsRepo();
      
      if (isRepo) {
        currentRepo.path = repoPath;
        currentRepo.name = path.basename(repoPath);
        const branch = await git.branchLocal();
        currentRepo.branch = branch.current;
        updateTrayTitle();
        return { success: true, repo: currentRepo };
      } else {
        return { error: 'Selected directory is not a Git repository' };
      }
    } catch (error: any) {
      return { error: error.message || 'Unknown error' };
    }
  }
  
  return { canceled: true };
});

// License handlers
ipcMain.handle('license:activate', async (_, email: string, key: string) => {
  const success = await LicenseManager.validateLicense(key, email);
  if (success) {
    // Reload main window
    mb.window?.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    return { success: true };
  }
  return { success: false, error: 'Invalid license key or activation failed' };
});

ipcMain.handle('license:openPurchase', () => {
  require('electron').shell.openExternal('https://gitsave.app/buy');
});

ipcMain.handle('branches:open', () => {
  const branchWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  branchWindow.loadFile(path.join(__dirname, '..', 'src', 'git-graph.html'));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});