import { menubar } from 'menubar';
import { app, BrowserWindow, ipcMain, Menu, MenuItem } from 'electron';
import * as path from 'path';
import simpleGit from 'simple-git';
import Store from 'electron-store';

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

mb.on('ready', () => {
  console.log('GitSave is ready!');
  
  // Update tray title periodically
  updateTrayTitle();
  setInterval(updateTrayTitle, 5000);
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});