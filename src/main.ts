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
import { StateManager } from './main/state/StateManager';
import { CollaborationStore } from './main/collaboration/CollaborationStore';

const store = new Store();

// Initialize services
const gitService = new GitService();
const branchService = new BranchService(gitService);
const fileService = new FileService();

// Initialize state manager
const stateManager = new StateManager(gitService, branchService, fileService);

// Initialize collaboration store (will be set up after repo is loaded)
let collaborationStore: CollaborationStore | null = null;

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

// Get current repo from state manager
const getCurrentRepo = () => stateManager.getStateValue('currentRepo');

mb.on('ready', async () => {
  // Initialize IPC Router with context
  ipcRouter = new IPCRouter({
    gitService,
    branchService,
    fileService,
    getCurrentRepo,
    handleBranchChange: (branch: string) => stateManager.changeBranch(branch),
    loadRepository: (path: string) => stateManager.loadRepository(path),
    mb,
    stateManager,
    getCollaborationStore: () => collaborationStore,
    updateCollaborationActivity: async (message: string) => {
      if (!collaborationStore) return;
      
      try {
        const currentBranch = stateManager.getStateValue('currentBranch');
        const lastCommit = await gitService.log(['-1', '--format=%H']);
        
        await collaborationStore.activity.logCommit(
          currentBranch,
          message,
          lastCommit.latest?.hash || ''
        );
        
        // Also update branch info
        await collaborationStore.branches.updateLastCommit(currentBranch, {
          hash: lastCommit.latest?.hash || '',
          message
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }
  } as any);
  
  // Register all IPC handlers
  ipcRouter.registerModule(handlers.gitHandlers);
  ipcRouter.registerModule(handlers.repoHandlers);
  ipcRouter.registerModule(handlers.licenseHandlers);
  ipcRouter.registerModule(handlers.collabHandlers);
  ipcRouter.registerModule(handlers.appHandlers);
  ipcRouter.registerModule(handlers.hookHandlers);
  ipcRouter.registerModule(handlers.taskHandlers);

  console.log('Intentional is ready!');
  console.log('Initial currentRepo:', stateManager.getStateValue('currentRepo'));
  
  // Check license - TEMPORARILY BYPASSED
  // [License check code omitted for brevity]
  
  // Load last project if available
  const lastRepo = stateManager.getStateValue('currentRepo');
  if (lastRepo.path) {
    stateManager.loadRepository(lastRepo.path);
  }
  
  // Subscribe to state changes
  stateManager.on('branch-changed', () => updateTrayTitle());
  stateManager.on('repo-changed', () => updateTrayTitle());
  stateManager.on('git-status-changed', (state) => {
    if (mb.window) {
      mb.window.webContents.send('git-status-changed', {
        hasChanges: state.hasFileChanges,
        filesChanged: state.filesChanged,
        modified: state.modifiedCount,
        created: state.createdCount,
        deleted: state.deletedCount,
        renamed: state.renamedCount
      });
    }
  });
  
  // Initial update
  updateTrayTitle();
  checkForUnprocessedCommits();
});

mb.on('after-create-window', () => {
  // Enable dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mb.window?.webContents.openDevTools({ mode: 'detach' });
  }
});

function updateTrayTitle() {
  const currentRepo = stateManager.getStateValue('currentRepo');
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

// State change notifications
stateManager.on('branch-changed', (state) => {
  if (mb.window) {
    mb.window.webContents.send('branch-changed', state.currentRepo);
  }
});

stateManager.on('repo-changed', (state) => {
  if (mb.window) {
    mb.window.webContents.send('repo-loaded', state.currentRepo);
  }
});

async function checkForUnprocessedCommits(): Promise<void> {
  const currentRepo = stateManager.getStateValue('currentRepo');
  if (!currentRepo.path) return;
  await fileService.checkForUnprocessedCommits(currentRepo.path);
}

// Git info updates are now handled by StateManager

// Repository loading is now handled by StateManager
// We need to add hook installation to StateManager
stateManager.on('repo-changed', async (state) => {
  if (state.isValidRepo && state.currentRepo.path) {
    await fileService.installGitHooks(state.currentRepo.path, path.join(__dirname, '..', 'src', 'hooks'));
    await fileService.ensureIntentionalDirectory(state.currentRepo.path);
    
    // Initialize collaboration store for this repo
    try {
      // Get user info from git config
      const [userName] = await Promise.all([
        gitService.getConfig('user.name')
      ]);
      
      const username = userName.value || 'user';
      
      // Initialize collaboration store
      collaborationStore = CollaborationStore.getInstance(
        gitService,
        state.currentRepo.path,
        username.toLowerCase().replace(/\s+/g, '-')
      );
      
      await collaborationStore.initialize();
      
      console.log('Collaboration store initialized for', username);
    } catch (error) {
      console.error('Failed to initialize collaboration store:', error);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stateManager.destroy();
});