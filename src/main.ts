import { menubar } from 'menubar';
import { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import simpleGit from 'simple-git';
import Store from 'electron-store';
import { LicenseManager } from './license';
import { GitDataFetcher } from './git-data-fetcher';

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
  console.log('Initial currentRepo:', currentRepo);
  
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
    mb.tray.setTitle(`${currentRepo.name}/${currentRepo.branch}`);
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

// Branch ownership management
interface BranchOwnership {
  branches: {
    [branchName: string]: {
      owner: string;
      email: string;
      createdAt: string;
    }
  }
}

async function getBranchOwnershipPath(): Promise<string> {
  if (!currentRepo.path) throw new Error('No repository path');
  return path.join(currentRepo.path, 'intentional.dev', 'branches', 'ownership.json');
}

async function ensureBranchesDirectory(): Promise<void> {
  if (!currentRepo.path) return;
  const branchesDir = path.join(currentRepo.path, 'intentional.dev', 'branches');
  try {
    await fs.mkdir(branchesDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create branches directory:', error);
  }
}

async function loadBranchOwnership(): Promise<BranchOwnership> {
  try {
    const filePath = await getBranchOwnershipPath();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty
    return { branches: {} };
  }
}

async function loadTeamBranches(): Promise<{ teamBranches: string[], teamBranchPrefixes: string[] }> {
  try {
    const filePath = path.join(currentRepo.path, 'intentional.dev', 'branches', 'team-branches.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return defaults
    return {
      teamBranches: ['main', 'master'],
      teamBranchPrefixes: ['release/', 'hotfix/']
    };
  }
}

async function saveBranchOwnership(ownership: BranchOwnership): Promise<void> {
  try {
    await ensureBranchesDirectory();
    const filePath = await getBranchOwnershipPath();
    await fs.writeFile(filePath, JSON.stringify(ownership, null, 2));
  } catch (error) {
    console.error('Failed to save branch ownership:', error);
  }
}

async function recordBranchOwner(branchName: string, owner: string, email: string): Promise<void> {
  const ownership = await loadBranchOwnership();
  ownership.branches[branchName] = {
    owner,
    email,
    createdAt: new Date().toISOString()
  };
  await saveBranchOwnership(ownership);
}

// Git hooks management
async function installGitHooks(): Promise<void> {
  if (!currentRepo.path) return;
  
  try {
    const hooksDir = path.join(currentRepo.path, '.git', 'hooks');
    const intentionalHooksDir = path.join(__dirname, '..', 'src', 'hooks');
    
    // Ensure hooks directory exists
    await fs.mkdir(hooksDir, { recursive: true });
    
    // Copy post-commit hook
    const postCommitSource = path.join(intentionalHooksDir, 'post-commit');
    const postCommitDest = path.join(hooksDir, 'post-commit');
    
    await fs.copyFile(postCommitSource, postCommitDest);
    // Make it executable
    await fs.chmod(postCommitDest, '755');
    
    console.log('Git hooks installed successfully');
  } catch (error) {
    console.error('Failed to install git hooks:', error);
  }
}

async function checkForUnprocessedCommits(): Promise<void> {
  if (!currentRepo.path) return;
  
  try {
    const commitsDir = path.join(currentRepo.path, '.intentional.dev', 'commits');
    
    try {
      const files = await fs.readdir(commitsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const filePath = path.join(commitsDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const commit = JSON.parse(data);
        
        if (!commit.processed) {
          // Here's where the "product agent" would analyze the commit
          console.log('Unprocessed commit found:', commit.hash);
          
          // For now, just mark it as processed
          commit.processed = true;
          commit.processedAt = new Date().toISOString();
          
          // In the future, this could:
          // - Send to an AI agent for analysis
          // - Generate insights about the changes
          // - Suggest next steps
          // - Create documentation
          // - etc.
          
          await fs.writeFile(filePath, JSON.stringify(commit, null, 2));
        }
      }
    } catch (error) {
      // Directory might not exist yet
      if ((error as any).code !== 'ENOENT') {
        console.error('Error checking commits:', error);
      }
    }
  } catch (error) {
    console.error('Failed to check for unprocessed commits:', error);
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
    const git = simpleGit(repoPath);
    const isRepo = await git.checkIsRepo();
    console.log('Is valid repo:', isRepo);
    
    if (isRepo) {
      currentRepo.path = repoPath;
      currentRepo.name = path.basename(repoPath);
      const branch = await git.branchLocal();
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
      await installGitHooks();
      
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

ipcMain.handle('git:getBranchOwner', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    // First check our ownership file
    const ownership = await loadBranchOwnership();
    if (ownership.branches[branchName]) {
      return {
        owner: ownership.branches[branchName].owner,
        email: ownership.branches[branchName].email
      };
    }
    
    // If not in file, check git history (for existing branches)
    const git = simpleGit(currentRepo.path);
    
    try {
      // Get the merge base with main to find where branch diverged
      const mergeBase = await git.raw(['merge-base', 'main', branchName]);
      const baseCommit = mergeBase.trim();
      
      // Get first commit after the merge base on this branch
      const branchCommits = await git.raw(['rev-list', `${baseCommit}..${branchName}`, '--reverse']);
      const firstUniqueCommit = branchCommits.split('\n')[0]?.trim();
      
      if (firstUniqueCommit) {
        // Get author of first unique commit
        const commitInfo = await git.show([firstUniqueCommit, '--format=%an%n%ae', '--no-patch']);
        const [author, email] = commitInfo.split('\n');
        
        // Save this info for future reference
        await recordBranchOwner(branchName, author, email);
        
        return {
          owner: author,
          email: email
        };
      }
    } catch (gitError) {
      // Branch might not have a common ancestor with main, or main might not exist
      console.log('Could not determine branch owner from git history:', gitError);
    }
    
    return { owner: null, email: null };
  } catch (error: any) {
    console.error('Failed to get branch owner:', error);
    return { owner: null, email: null };
  }
});

ipcMain.handle('git:checkAuth', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Check if user.name and user.email are configured
    const [userName, userEmail] = await Promise.all([
      git.getConfig('user.name'),
      git.getConfig('user.email')
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
    const credentialHelper = await git.getConfig('credential.helper');
    
    // Check for remotes
    const remotes = await git.getRemotes(true);
    
    return {
      configured: true,
      userName: userName.value,
      userEmail: userEmail.value,
      credentialHelper: credentialHelper.value || 'none',
      hasRemotes: remotes.length > 0,
      remotes: remotes.map(r => ({
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
    const git = simpleGit(currentRepo.path);
    
    // Check if there are changes to commit
    const status = await git.status();
    if (status.files.length === 0) {
      return { error: 'No changes to save' };
    }
    
    // Check branch ownership unless forced
    if (!forceCommit && currentRepo.branch !== 'main') {
      // Get current user
      const [userName, userEmail] = await Promise.all([
        git.getConfig('user.name'),
        git.getConfig('user.email')
      ]);
      
      const currentUser = userName.value;
      const currentEmail = userEmail.value;
      
      // Get branch owner
      let branchOwnerResult;
      try {
        const git2 = simpleGit(currentRepo.path);
        // Get the merge base with main to find where branch diverged
        const mergeBase = await git2.raw(['merge-base', 'main', currentRepo.branch]);
        const baseCommit = mergeBase.trim();
        
        // Get first commit after the merge base on this branch
        const branchCommits = await git2.raw(['rev-list', `${baseCommit}..${currentRepo.branch}`, '--reverse']);
        const firstUniqueCommit = branchCommits.split('\n')[0]?.trim();
        
        if (firstUniqueCommit) {
          // Get author of first unique commit
          const commitInfo = await git2.show([firstUniqueCommit, '--format=%an%n%ae', '--no-patch']);
          const [author, email] = commitInfo.split('\n');
          branchOwnerResult = { owner: author, email: email };
        } else {
          branchOwnerResult = { owner: null, email: null };
        }
      } catch (err) {
        branchOwnerResult = { owner: null, email: null };
      }
      
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
    
    await git.add('.');
    await git.commit(message || 'WIP');
    
    // Try to push, but don't fail if it doesn't work
    try {
      await git.push();
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
    const git = simpleGit(currentRepo.path);
    await git.fetch();
    await git.pull();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Unknown error' };
  }
});

// Time travel handlers
ipcMain.handle('git:timeTravelTo', async (_, commitHash: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // First time travel - save current state
    if (!timeTravelState.isActive) {
      // Get current branch
      const branches = await git.branchLocal();
      timeTravelState.originalBranch = branches.current;
      
      // Check for uncommitted changes
      const status = await git.status();
      if (!status.isClean()) {
        // Stash changes
        await git.stash(['push', '-m', 'Intentional time-travel stash']);
        timeTravelState.hasStash = true;
      }
      
      timeTravelState.isActive = true;
    }
    
    // Checkout the commit
    await git.checkout(commitHash);
    timeTravelState.currentCommit = commitHash;
    
    // Get commit info
    const log = await git.log([commitHash, '-n', '1']);
    const commit = log.latest;
    
    if (!commit) {
      throw new Error('Commit not found');
    }
    
    return { 
      success: true,
      commit: {
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date
      },
      isTimeTravel: true,
      originalBranch: timeTravelState.originalBranch
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to travel to commit' };
  }
});

ipcMain.handle('git:timeTravelReturn', async () => {
  if (!currentRepo.path || !timeTravelState.isActive) {
    return { error: 'Not in time travel mode' };
  }
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Return to original branch
    await git.checkout(timeTravelState.originalBranch);
    
    // Pop stash if we had one
    if (timeTravelState.hasStash) {
      try {
        await git.stash(['pop']);
      } catch (err) {
        console.error('Failed to pop stash:', err);
        // Continue anyway - user can recover stash manually
      }
    }
    
    // Store original branch before reset
    const originalBranch = timeTravelState.originalBranch;
    
    // Reset state
    timeTravelState = {
      isActive: false,
      originalBranch: '',
      hasStash: false,
      currentCommit: ''
    };
    
    handleBranchChange(originalBranch);
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to return from time travel' };
  }
});

ipcMain.handle('git:push', async () => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Check if we have a remote configured
    const remotes = await git.getRemotes(true);
    if (remotes.length === 0) {
      return { 
        error: 'No remote repository configured',
        authError: true,
        guidance: 'This repository is not connected to GitHub/GitLab. To fix this:\n\n1. Open Terminal\n2. Navigate to your project folder\n3. Run: git remote add origin [your-repository-url]\n4. Try pushing again'
      };
    }
    
    await git.push();
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
    try {
      const git = simpleGit(repoPath);
      const isRepo = await git.checkIsRepo();
      
      if (isRepo) {
        currentRepo.path = repoPath;
        currentRepo.name = path.basename(repoPath);
        const branch = await git.branchLocal();
        
        // Save to persistent storage
        store.set('lastRepoPath', repoPath);
        store.set('lastRepoName', currentRepo.name);
        
        // Use handleBranchChange to set branch and notify
        handleBranchChange(branch.current);
        
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
    const git = simpleGit(currentRepo.path);
    const remotes = await git.getRemotes(true);
    
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
    const git = simpleGit(currentRepo.path);
    const status = await git.status();
    
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
    const teamBranchConfig = await loadTeamBranches();
    
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
    const branchOwnership = await loadBranchOwnership();
    
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
    const git = simpleGit(currentRepo.path);
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

// Track time travel state
let timeTravelState = {
  isActive: false,
  originalBranch: '',
  hasStash: false,
  currentCommit: ''
};

// Branch operation handlers
ipcMain.handle('git:createBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Get current user info
    const [userName, userEmail] = await Promise.all([
      git.getConfig('user.name'),
      git.getConfig('user.email')
    ]);
    
    // Create the branch
    await git.checkoutBranch(branchName, currentRepo.branch);
    
    // Record ownership
    if (userName.value && userEmail.value) {
      await recordBranchOwner(branchName, userName.value, userEmail.value);
      
      // Commit the ownership file
      try {
        await git.add('intentional.dev/branches/ownership.json');
        await git.commit(`Initialize branch ownership for ${branchName}

This branch is owned by ${userName.value}
Automatically generated by Intentional`);
        
        // Try to push if remote exists
        try {
          await git.push('origin', branchName, ['--set-upstream']);
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
    const git = simpleGit(currentRepo.path);
    await git.checkout(branchName);
    handleBranchChange(branchName);
    return { success: true, branch: branchName };
  } catch (error: any) {
    return { error: error.message || 'Failed to switch branch' };
  }
});

ipcMain.handle('git:deleteBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    // Don't allow deleting current branch
    if (branchName === currentRepo.branch) {
      return { error: 'Cannot delete current branch' };
    }
    await git.deleteLocalBranch(branchName);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete branch' };
  }
});

ipcMain.handle('git:claimBranch', async (_, branchName: string) => {
  if (!currentRepo.path) return { error: 'No repository selected' };
  
  try {
    const git = simpleGit(currentRepo.path);
    
    // Get current user info
    const [userName, userEmail] = await Promise.all([
      git.getConfig('user.name'),
      git.getConfig('user.email')
    ]);
    
    if (userName.value && userEmail.value) {
      await recordBranchOwner(branchName, userName.value, userEmail.value);
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
    const git = simpleGit(currentRepo.path);
    const branches = await git.branchLocal();
    
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
    
    // Load team branches configuration
    const teamBranchConfig = await loadTeamBranches();
    
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
  try {
    await installGitHooks();
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