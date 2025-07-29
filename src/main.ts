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

const store = new Store();

// Initialize services
const gitService = new GitService();
const branchService = new BranchService(gitService);
const fileService = new FileService();

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

// IPC handlers for Git operations
ipcMain.handle('git:status', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const status = await gitService.getStatus();
    return { status };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('git:getBranchOwner', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  return await branchService.getBranchOwner(currentRepo.path, branchName);
});

ipcMain.handle('git:checkAuth', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Check if user.name and user.email are configured
    const [userName, userEmail] = await Promise.all([
      gitService.getConfig('user.name'),
      gitService.getConfig('user.email')
    ]);
    
    if (!userName.value || !userEmail.value) {
      return {
        configured: false,
        missing: {
          name: !userName.value,
          email: !userEmail.value
        },
        guidance: 'Git is not fully configured. To fix this:\n\n1. Open Terminal\n2. Run these commands:\n   git config --global user.name "Your Name"\n   git config --global user.email "your.email@example.com"\n\n3. Restart Intentional'
      };
    }
    
    // Check for credential helper
    const credentialHelper = await gitService.getConfig('credential.helper');
    
    // Check for remotes
    const remotes = await gitService.getRemotes(true);
    
    return {
      configured: true,
      userName: userName.value,
      userEmail: userEmail.value,
      credentialHelper: credentialHelper.value || 'none',
      hasRemotes: remotes.length > 0,
      remotes: remotes.map((r: any) => ({
        name: r.name,
        url: r.refs.push || r.refs.fetch
      }))
    };
  } catch (error: any) {
    return { error: error.message || 'Unknown error checking authentication' };
  }
});

ipcMain.handle('git:save', async (_, message: string, forceCommit?: boolean) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Check if there are changes to commit
    const status = await gitService.getStatus();
    if (status.files.length === 0) {
      return { error: 'No changes to save' };
    }
    
    // Check branch ownership unless forced
    if (!forceCommit && currentRepo.branch !== 'main') {
      // Get current user
      const [userName, userEmail] = await Promise.all([
        gitService.getConfig('user.name'),
        gitService.getConfig('user.email')
      ]);
      
      const currentUser = userName.value;
      const currentEmail = userEmail.value;
      
      // Get branch owner
      const branchOwnerResult = await branchService.getBranchOwner(currentRepo.path, currentRepo.branch);
      
      if (branchOwnerResult.owner && branchOwnerResult.email) {
        // Check if current user owns the branch
        if (branchOwnerResult.email !== currentEmail) {
          return {
            needsConfirmation: true,
            branchOwner: branchOwnerResult.owner,
            branchOwnerEmail: branchOwnerResult.email,
            currentBranch: currentRepo.branch,
            message: `This branch belongs to ${branchOwnerResult.owner}. You should create your own branch before making changes.`
          };
        }
      }
    }
    
    await gitService.addAll();
    await gitService.commit(message || 'WIP');
    
    // Try to push, but don't fail if it doesn't work
    try {
      await gitService.push();
      return { success: true, pushed: true };
    } catch (pushError: any) {
      // Commit succeeded but push failed
      return { 
        success: true, 
        pushed: false,
        pushError: pushError.message,
        warning: 'Changes saved locally but not pushed to remote. Use the Push button when ready.'
      };
    }
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

ipcMain.handle('git:sync', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    await gitService.fetch();
    await gitService.pull();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

// Time travel handlers
ipcMain.handle('git:timeTravelTo', async (_, commitHash: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  const result = await gitService.timeTravelTo(commitHash);
  if (result.success && result.originalBranch) {
    handleBranchChange(result.originalBranch);
  }
  return result;
});

ipcMain.handle('git:timeTravelReturn', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  const state = gitService.getTimeTravelState();
  if (!state.isActive) {
    return { error: 'Not in time travel mode' };
  }
  
  const result = await gitService.timeTravelReturn();
  if (result.success) {
    handleBranchChange(state.originalBranch);
  }
  return result;
});

ipcMain.handle('git:push', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Check if we have a remote configured
    const remotes = await gitService.getRemotes(true);
    if (remotes.length === 0) {
      return { 
        error: 'No remote repository configured',
        authError: true,
        guidance: 'This repository is not connected to GitHub/GitLab. To fix this:\n\n1. Open Terminal\n2. Navigate to your project folder\n3. Run: git remote add origin [your-repository-url]\n4. Try pushing again'
      };
    }
    
    await gitService.push();
    return { success: true };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    
    // Analyze error for specific authentication issues
    if (errorMessage.includes('Authentication failed') || 
        errorMessage.includes('could not read Username') ||
        errorMessage.includes('Invalid username or password') ||
        errorMessage.includes('remote: Invalid username or password') ||
        errorMessage.includes('fatal: Authentication failed')) {
      return { 
        error: 'Authentication failed',
        authError: true,
        guidance: 'Git needs your credentials to push. To fix this:\n\n1. Open Terminal\n2. Run one of these commands:\n   - For GitHub: gh auth login\n   - For HTTPS: git config --global credential.helper osxkeychain\n   - For SSH: ssh-keygen -t ed25519 -C "your_email@example.com"\n\n3. Follow the prompts to set up authentication\n4. Try pushing again'
      };
    }
    
    if (errorMessage.includes('Permission denied') || 
        errorMessage.includes('ERROR: Permission to') ||
        errorMessage.includes('403')) {
      return { 
        error: 'Permission denied',
        authError: true,
        guidance: 'You don\'t have permission to push to this repository. This could mean:\n\n1. You need to be added as a collaborator\n2. The repository belongs to someone else\n3. Your access token doesn\'t have push permissions\n\nContact the repository owner or check your permissions.'
      };
    }
    
    if (errorMessage.includes('Could not resolve host') || 
        errorMessage.includes('unable to access')) {
      return { 
        error: 'Network error',
        authError: false,
        guidance: 'Unable to reach the Git server. Please check:\n\n1. Your internet connection\n2. If you\'re behind a firewall or VPN\n3. The repository URL is correct'
      };
    }
    
    if (errorMessage.includes('! [rejected]') || 
        errorMessage.includes('non-fast-forward')) {
      return { 
        error: 'Push rejected - Remote has changes',
        authError: false,
        guidance: 'The remote repository has changes you don\'t have locally. To fix:\n\n1. Click "Sync" to pull remote changes\n2. Resolve any conflicts if they occur\n3. Try pushing again'
      };
    }
    
    // Generic error with the original message
    return { 
      error: errorMessage,
      authError: false,
      guidance: 'An unexpected error occurred. You might try:\n\n1. Opening Terminal and running "git push" manually to see more details\n2. Checking if the repository is properly configured\n3. Verifying your Git installation is working'
    };
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
    const loaded = await loadRepository(repoPath);
    
    if (loaded) {
      return { success: true, repo: currentRepo };
    } else {
      return { error: 'Selected directory is not a Git repository' };
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

// Collaboration handlers
ipcMain.handle('collab:read', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const collabPath = path.join(currentRepo.path, 'intentional.dev', 'collaboration', 'garett.json');
    const data = await fs.readFile(collabPath, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error: any) {
    // File doesn't exist yet, return empty structure
    return { 
      success: true, 
      data: {
        username: 'garett',
        email: '',
        lastUpdated: new Date().toISOString(),
        tasks: [],
        goals: [],
        builds: [],
        updates: []
      }
    };
  }
});

ipcMain.handle('collab:write', async (_, data: any) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const collabDir = path.join(currentRepo.path, 'intentional.dev', 'collaboration');
    await fs.mkdir(collabDir, { recursive: true });
    
    const collabPath = path.join(collabDir, 'garett.json');
    data.lastUpdated = new Date().toISOString();
    
    await fs.writeFile(collabPath, JSON.stringify(data, null, 2));
    
    // Auto-commit collaboration changes
    await gitService.addAll();
    await gitService.commit('Update collaboration data');
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('collab:readTeam', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Fetch latest changes
    await gitService.fetch();
    
    // Get list of collaboration files from other team members
    // For now, we'll just check for a partner.json file
    const teamData = [];
    
    try {
      // Try to read partner's data using git show
      const partnerData = await gitService.show(['origin/main:intentional.dev/collaboration/partner.json']);
      teamData.push(JSON.parse(partnerData));
    } catch (e) {
      // Partner file doesn't exist yet
    }
    
    return { success: true, data: teamData };
  } catch (error: any) {
    return { error: error.message };
  }
});

ipcMain.handle('app:openFolder', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    require('electron').shell.openPath(currentRepo.path);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to open folder' };
  }
});

ipcMain.handle('app:openGithub', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const remotes = await gitService.getRemotes(true);
    
    if (remotes.length === 0) {
      return { error: 'No remote repository configured' };
    }
    
    // Get the first remote URL (usually 'origin')
    const remoteUrl = remotes[0].refs.push || remotes[0].refs.fetch;
    
    // Convert git URL to GitHub web URL
    let webUrl = remoteUrl;
    if (remoteUrl.startsWith('git@github.com:')) {
      // SSH format: git@github.com:user/repo.git
      webUrl = remoteUrl.replace('git@github.com:', 'https://github.com/').replace('.git', '');
    } else if (remoteUrl.startsWith('https://github.com/')) {
      // HTTPS format: already good, just remove .git
      webUrl = remoteUrl.replace('.git', '');
    } else {
      return { error: 'Remote is not a GitHub repository' };
    }
    
    require('electron').shell.openExternal(webUrl);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to open GitHub' };
  }
});

ipcMain.handle('changes:preview', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const status = await gitService.getStatus();
    
    // Create preview window
    const previewWindow = new BrowserWindow({
      width: 500,
      height: 400,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preview-preload.js')
      },
      titleBarStyle: 'hiddenInset',
      alwaysOnTop: true,
      resizable: false
    });
    
    previewWindow.loadFile(path.join(__dirname, '..', 'src', 'changes-preview.html'));
    
    // Send file changes after window loads
    previewWindow.webContents.once('did-finish-load', () => {
      previewWindow.webContents.send('file-changes', {
        files: status.files,
        modified: status.modified.length,
        created: status.created.length,
        deleted: status.deleted.length,
        renamed: status.renamed.length
      });
    });
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to show changes' };
  }
});

ipcMain.handle('branches:open', async () => {
  // Get current branch data first
  if (!currentRepo.path) {
    return { error: 'No repository selected' };
  }
  
  try {
    // Use GitDataFetcher to get comprehensive git data with WIP filtering enabled
    const fetcher = new GitDataFetcher(currentRepo.path, true);
    const gitData = await fetcher.fetchComprehensiveData();
    
    // Load team branches configuration
    const teamBranchConfig = await branchService.loadTeamBranches(currentRepo.path);
    
    console.log('Fetched git data:');
    console.log('- Branches:', gitData.branches.length);
    console.log('- All commits:', gitData.allCommits.length);
    console.log('- Branch details:', gitData.branchDetails.length);
    console.log('- Team branches:', teamBranchConfig);
    
    // Create and show window
    const branchWindow = new BrowserWindow({
      width: 1400,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'branch-preload.js')
      }
    });
    
    branchWindow.loadFile(path.join(__dirname, '..', 'src', 'branch-manager.html'));
    
    // Load branch ownership data
    const branchOwnership = await branchService.loadBranchOwnership(currentRepo.path);
    
    // Send data after window is ready
    branchWindow.webContents.once('did-finish-load', () => {
      branchWindow.webContents.send('branch-window-data', {
        ...gitData,
        teamBranches: teamBranchConfig.teamBranches,
        teamBranchPrefixes: teamBranchConfig.teamBranchPrefixes,
        branchOwnership: branchOwnership.branches
      });
    });
    
    // Non-blocking fetch in background
    gitService.fetch().then(() => {
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

// Time travel state is now managed by GitService

// Branch operation handlers
ipcMain.handle('git:createBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Get current user info
    const [userName, userEmail] = await Promise.all([
      gitService.getConfig('user.name'),
      gitService.getConfig('user.email')
    ]);
    
    // Create the branch
    await gitService.checkoutBranch(branchName, currentRepo.branch);
    
    // Record ownership
    if (userName.value && userEmail.value) {
      await branchService.recordBranchOwner(currentRepo.path, branchName, userName.value, userEmail.value);
      
      // Commit the ownership file
      try {
        await gitService.addAll();
        await gitService.commit(`Initialize branch ownership for ${branchName}

This branch is owned by ${userName.value}
Automatically generated by Intentional`);
        
        // Try to push if remote exists
        try {
          await gitService.push('origin', branchName, ['--set-upstream']);
        } catch (pushError) {
          // Push might fail if no remote or no auth, that's ok
          console.log('Could not push new branch:', pushError);
        }
      } catch (commitError) {
        // If nothing to commit (rare case), that's ok
        console.log('No changes to commit for ownership file');
      }
    }
    
    handleBranchChange(branchName);
    return { success: true, branch: branchName };
  } catch (error: any) {
    return { error: error.message || 'Failed to create branch' };
  }
});

ipcMain.handle('git:switchBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    await gitService.checkout(branchName);
    handleBranchChange(branchName);
    return { success: true, branch: branchName };
  } catch (error: any) {
    return { error: error.message || 'Failed to switch branch' };
  }
});

ipcMain.handle('git:deleteBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Don't allow deleting current branch
    if (branchName === currentRepo.branch) {
      return { error: 'Cannot delete current branch' };
    }
    await gitService.deleteLocalBranch(branchName);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete branch' };
  }
});

ipcMain.handle('git:claimBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // Get current user info
    const [userName, userEmail] = await Promise.all([
      gitService.getConfig('user.name'),
      gitService.getConfig('user.email')
    ]);
    
    if (userName.value && userEmail.value) {
      await branchService.recordBranchOwner(currentRepo.path, branchName, userName.value, userEmail.value);
      return { success: true, owner: userName.value, email: userEmail.value };
    } else {
      return { error: 'Git user not configured' };
    }
  } catch (error: any) {
    return { error: error.message || 'Failed to claim branch' };
  }
});

ipcMain.handle('git:getBranches', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const branches = await gitService.getBranches();
    const branchDetails = await branchService.getAllBranchDetails(currentRepo.path);
    const teamBranchConfig = await branchService.loadTeamBranches(currentRepo.path);
    
    return { 
      success: true, 
      currentBranch: branches.current,
      branches: branchDetails,
      teamBranches: teamBranchConfig.teamBranches,
      teamBranchPrefixes: teamBranchConfig.teamBranchPrefixes
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to get branches' };
  }
});

// Hook management handlers
ipcMain.handle('hooks:install', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    await fileService.installGitHooks(currentRepo.path, path.join(__dirname, '..', 'src', 'hooks'));
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to install hooks' };
  }
});

ipcMain.handle('agent:configure', async (_, config: any) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const configDir = path.join(currentRepo.path, '.intentional.dev', 'config');
    await fs.mkdir(configDir, { recursive: true });
    
    const configPath = path.join(configDir, 'agent.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save agent configuration' };
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});