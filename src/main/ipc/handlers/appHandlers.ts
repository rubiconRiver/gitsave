import { IPCHandler, IPCContext } from '../IPCRouter';
import { app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import { GitDataFetcher } from '../../../git-data-fetcher';

export const appHandlers: { [key: string]: IPCHandler } = {
  'app:quit': async function(this: IPCContext) {
    app.quit();
  },

  'app:openFolder': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      shell.openPath(currentRepo.path);
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to open folder' };
    }
  },

  'app:openGithub': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const remotes = await this.gitService.getRemotes(true);
      
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
      
      shell.openExternal(webUrl);
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to open GitHub' };
    }
  },

  'changes:preview': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const status = await this.gitService.getStatus();
      
      // Create preview window
      const previewWindow = new BrowserWindow({
        width: 500,
        height: 400,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '..', '..', '..', 'preview-preload.js')
        },
        titleBarStyle: 'hiddenInset',
        alwaysOnTop: true,
        resizable: false
      });
      
      previewWindow.loadFile(path.join(__dirname, '..', '..', '..', '..', 'src', 'changes-preview.html'));
      
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
  },

  'branches:open': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) {
      return { error: 'No repository selected' };
    }
    
    try {
      // Use GitDataFetcher to get comprehensive git data with WIP filtering enabled
      const fetcher = new GitDataFetcher(currentRepo.path, true);
      const gitData = await fetcher.fetchComprehensiveData();
      
      // Load team branches configuration
      const teamBranchConfig = await this.branchService.loadTeamBranches(currentRepo.path);
      
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
          preload: path.join(__dirname, '..', '..', '..', 'branch-preload.js')
        }
      });
      
      branchWindow.loadFile(path.join(__dirname, '..', '..', '..', '..', 'src', 'branch-manager.html'));
      
      // Load branch ownership data
      const branchOwnership = await this.branchService.loadBranchOwnership(currentRepo.path);
      
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
      this.gitService.fetch().then(() => {
        console.log('Git fetch completed');
      }).catch(err => {
        console.error('Git fetch failed:', err);
      });
      
    } catch (error: any) {
      console.error('Failed to open branches:', error);
      return { error: error.message };
    }
  }
};