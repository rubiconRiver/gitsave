import { menubar } from 'menubar';
import { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import Store from 'electron-store';
import { LicenseManager } from './license';
import { GitDataFetcher } from './git-data-fetcher';
import { GitService } from './main/services/GitService';
import { BranchService } from './main/services/BranchService';
import { FileService } from './main/services/FileService';
import { RepoInfo, CommitResult, TimeTravelState } from './main/types';
import { IPCRouter } from './main/ipc/IPCRouter';
import * as handlers from './main/ipc/handlers';

const store = new Store();

// Initialize services
const gitService = new GitService();
const branchService = new BranchService(gitService);
const fileService = new FileService();

// Initialize IPC Router
let ipcRouter: IPCRouter;

const mb = menubar({
  index: `file://${path.join(__dirname, '..', 'src', 'index.html')}`,
  browserWindow: {
    width: 800,
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
  icon: path.join(__dirname, '..', 'assets', 'menubar-icon.png')
});

// Track current repo info
let currentRepo: RepoInfo = {
  path: store.get('lastRepoPath', '') as string,
  name: store.get('lastRepoName', 'No Project') as string,
  branch: store.get('lastRepoBranch', 'main') as string
};

mb.on('ready', async () => {
  // Initialize IPC Router with context
  ipcRouter = new IPCRouter({
    gitService,
    branchService,
    fileService,
    getCurrentRepo: () => currentRepo,
    handleBranchChange,
    loadRepository,
    mb
  } as any);
  
  // Register all IPC handlers
  ipcRouter.registerModule(handlers.gitHandlers);
  ipcRouter.registerModule(handlers.repoHandlers);
  ipcRouter.registerModule(handlers.licenseHandlers);
  ipcRouter.registerModule(handlers.collabHandlers);
  ipcRouter.registerModule(handlers.appHandlers);
  ipcRouter.registerModule(handlers.hookHandlers);

  console.log('Intentional is ready!');
  console.log('Initial currentRepo:', currentRepo);
  
  // Check license - TEMPORARILY BYPASSED
  // if (!LicenseManager.isLicensed()) {
  //   const result = await dialog.showMessageBox({
  //     type: 'info',
  //     title: 'Intentional - License Required',
  //     message: 'Please enter your license key to activate Intentional',
  //     buttons: ['Enter License', 'Buy License', 'Dev Mode', 'Quit']
  //   });
  //   
  //   if (result.response === 0) {
  //     // Show license dialog
  //     mb.window?.loadFile(path.join(__dirname, '..', 'src', 'license.html'));
  //   } else if (result.response === 1) {
  //     // Open purchase page
  //     require('electron').shell.openExternal('https://getintentional.dev/buy');
  //     app.quit();
  //   } else if (result.response === 2) {
  //     // Dev mode - skip license check
  //     console.log('Running in dev mode - license bypassed');
  //     // Continue normal startup
  //   } else {
  //     app.quit();
  //     return;
  //   }
  //   
  //   if (result.response !== 2) {
  //     return;
  //   }
  // }
  
  // Load last project if available
  if (currentRepo.path) {
    loadRepository(currentRepo.path);
  }
  
  // Update tray title and git info periodically
  updateTrayTitle();
  updateGitInfo();
  checkForUnprocessedCommits(); // Check on startup
  
  setInterval(() => {
    updateTrayTitle();
    updateGitInfo();
  }, 2000); // Check every 2 seconds
  
  // Check for unprocessed commits less frequently
  setInterval(() => {
    checkForUnprocessedCommits();
  }, 10000); // Check every 10 seconds
});

mb.on('after-create-window', () => {
  // Enable dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mb.window?.webContents.openDevTools({ mode: 'detach' });
  }
});

function updateTrayTitle() {
  console.log('updateTrayTitle called, mb.tray exists:', !!mb.tray);
  if (mb.tray) {
    // Show default text if no project is selected
    if (!currentRepo.name || currentRepo.name === 'No Project') {
      mb.tray.setTitle('Intentional - choose a project');
    } else {
      mb.tray.setTitle(`${currentRepo.name}/${currentRepo.branch}`);
    }
    // Ensure icon is always visible
    mb.tray.setImage(path.join(__dirname, '..', 'assets', 'menubar-icon.png'));
  } else {
    console.log('WARNING: mb.tray is null!');
  }
}

// Central function to handle branch changes
function handleBranchChange(newBranch: string) {
  currentRepo.branch = newBranch;
  store.set('lastRepoBranch', newBranch);
  updateTrayTitle();
  
  // Notify the main window about branch change
  if (mb.window) {
    mb.window.webContents.send('branch-changed', currentRepo);
  }
}

// Branch ownership is now handled by BranchService

// File operations are now handled by FileService

async function checkForUnprocessedCommits(): Promise<void> {
  if (!currentRepo.path) return;
  await fileService.checkForUnprocessedCommits(currentRepo.path);
}

async function updateGitInfo() {
  if (!currentRepo.path) return;
  
  try {
    const [branchInfo, status] = await Promise.all([
      gitService.getBranches(),
      gitService.getStatus()
    ]);
    
    // Check for branch changes
    if (branchInfo.current !== currentRepo.branch) {
      handleBranchChange(branchInfo.current);
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
  console.log('loadRepository called with:', repoPath);
  try {
    gitService.setRepository(repoPath);
    const isRepo = await gitService.checkIsRepo();
    console.log('Is valid repo:', isRepo);
    
    if (isRepo) {
      currentRepo.path = repoPath;
      currentRepo.name = path.basename(repoPath);
      const branch = await gitService.getBranches();
      console.log('Current git branch:', branch.current);
      console.log('Stored branch was:', currentRepo.branch);
      
      // Update persistent storage
      store.set('lastRepoPath', repoPath);
      store.set('lastRepoName', currentRepo.name);
      
      // Use handleBranchChange to set branch and notify
      handleBranchChange(branch.current);
      
      // Notify renderer if window is open
      if (mb.window) {
        mb.window.webContents.send('repo-loaded', currentRepo);
      }
      
      // Install git hooks for this repository
      await fileService.installGitHooks(repoPath, path.join(__dirname, '..', 'src', 'hooks'));
      
      // Ensure .intentional.dev directory exists (so it's already ignored by git)
      await fileService.ensureIntentionalDirectory(repoPath);
      
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});