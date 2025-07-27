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
  tooltip: 'Intentional',
  icon: path.join(__dirname, '..', 'assets', 'icon.png')
});

// Track current repo info
let currentRepo = {
  path: store.get('lastRepoPath', '') as string,
  name: store.get('lastRepoName', 'No Project') as string,
  branch: store.get('lastRepoBranch', 'main') as string
};

mb.on('ready', async () => {
  console.log('Intentional is ready!');
  
  // Check license
  if (!LicenseManager.isLicensed()) {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Intentional - License Required',
      message: 'Please enter your license key to activate Intentional',
      buttons: ['Enter License', 'Buy License', 'Dev Mode', 'Quit']
    });
    
    if (result.response === 0) {
      // Show license dialog
      mb.window?.loadFile(path.join(__dirname, '..', 'src', 'license.html'));
    } else if (result.response === 1) {
      // Open purchase page
      require('electron').shell.openExternal('https://getintentional.dev/buy');
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
  
  // Load last project if available
  if (currentRepo.path) {
    loadRepository(currentRepo.path);
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
    const [branchInfo, status] = await Promise.all([
      git.branchLocal(),
      git.status()
    ]);
    
    // Check for branch changes
    if (branchInfo.current !== currentRepo.branch) {
      currentRepo.branch = branchInfo.current;
      store.set('lastRepoBranch', currentRepo.branch);
      
      // Notify the renderer window about branch change
      if (mb.window) {
        mb.window.webContents.send('branch-changed', currentRepo);
      }
    }
    
    // Send file change status to renderer
    if (mb.window) {
      const hasChanges = status.files.length > 0;
      mb.window.webContents.send('git-status-changed', {
        hasChanges,
        filesChanged: status.files.length,
        // Don't send the full status object, just what we need
        modified: status.modified.length,
        created: status.created.length,
        deleted: status.deleted.length,
        renamed: status.renamed.length
      });
    }
  } catch (error) {
    console.error('Failed to update git info:', error);
  }
}

async function loadRepository(repoPath: string) {
  try {
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    
    if (isRepo) {
      currentRepo.path = repoPath;
      currentRepo.name = path.basename(repoPath);
      const branch = await git.branchLocal();
      currentRepo.branch = branch.current;
      
      // Update persistent storage
      store.set('lastRepoPath', repoPath);
      store.set('lastRepoName', currentRepo.name);
      store.set('lastRepoBranch', currentRepo.branch);
      
      updateTrayTitle();
      
      // Notify renderer if window is open
      if (mb.window) {
        mb.window.webContents.send('repo-loaded', currentRepo);
      }
      
      console.log('Loaded repository:', currentRepo);
      return true;
    } else {
      console.error('Not a valid git repository:', repoPath);
      // Clear invalid saved path
      store.delete('lastRepoPath');
      store.delete('lastRepoName');
      store.delete('lastRepoBranch');
      currentRepo.path = '';
      currentRepo.name = 'No Project';
      currentRepo.branch = 'main';
      return false;
    }
  } catch (error) {
    console.error('Failed to load repository:', error);
    return false;
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
    
    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length === 0) {
      return { error: 'No changes to save' };
    }
    
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
        
        // Save to persistent storage
        store.set('lastRepoPath', repoPath);
        store.set('lastRepoName', currentRepo.name);
        store.set('lastRepoBranch', currentRepo.branch);
        
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
  require('electron').shell.openExternal('https://getintentional.dev/buy');
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('branches:open', async () => {
  // Get current branch data first
  if (!currentRepo.path) {
    return { error: 'No repository selected' };
  }
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Get local branches (fast)
    const branches = await git.branchLocal();
    const log = await git.log(['--oneline', '-n', '50']);
    
    // Get raw graph output
    const rawGraph = await git.raw(['log', '--graph', '--oneline', '--all', '-n', '20']);
    
    // Get branch details with last commit info
    const branchDetails = [];
    for (const branch of branches.all) {
      try {
        const branchLog = await git.log([branch, '-n', '1']);
        const lastCommit = branchLog.latest;
        branchDetails.push({
          name: branch,
          lastCommit: lastCommit ? {
            hash: lastCommit.hash,
            message: lastCommit.message,
            author: lastCommit.author_name,
            email: lastCommit.author_email,
            date: lastCommit.date
          } : null
        });
      } catch (err) {
        console.error(`Failed to get details for branch ${branch}:`, err);
      }
    }
    
    console.log('Branch details:', branchDetails);
    
    // Save current git data
    const gitData = {
      currentBranch: branches.current,
      branches: branches.all,
      branchDetails: branchDetails,
      log: log.all,
      rawGraph: rawGraph,
      repoPath: currentRepo.path
    };
    
    // Create and show window
    const branchWindow = new BrowserWindow({
      width: 1400,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        additionalArguments: [JSON.stringify(gitData)]
      }
    });
    
    branchWindow.loadFile(path.join(__dirname, '..', 'src', 'branch-manager.html'));
    
    // Non-blocking fetch in background
    git.fetch().then(() => {
      console.log('Git fetch completed');
      // Could send update to window if needed
    }).catch(err => {
      console.error('Git fetch failed:', err);
    });
    
  } catch (error: any) {
    console.error('Failed to open branches:', error);
    return { error: error.message };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});