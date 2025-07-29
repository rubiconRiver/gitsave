import { IPCHandler, IPCContext } from '../IPCRouter';
import * as path from 'path';

export const gitHandlers: { [key: string]: IPCHandler } = {
  'git:status': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const status = await this.gitService.getStatus();
      return { status };
    } catch (error: any) {
      return { error: error.message || 'Unknown error' };
    }
  },

  'git:getBranchOwner': async function(this: IPCContext, _, branchName: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    return await this.branchService.getBranchOwner(currentRepo.path, branchName);
  },

  'git:checkAuth': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const [userName, userEmail] = await Promise.all([
        this.gitService.getConfig('user.name'),
        this.gitService.getConfig('user.email')
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
      
      const credentialHelper = await this.gitService.getConfig('credential.helper');
      const remotes = await this.gitService.getRemotes(true);
      
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
  },

  'git:save': async function(this: IPCContext, _, message: string, forceCommit?: boolean) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const status = await this.gitService.getStatus();
      if (status.files.length === 0) {
        return { error: 'No changes to save' };
      }
      
      if (!forceCommit && currentRepo.branch !== 'main') {
        const [userName, userEmail] = await Promise.all([
          this.gitService.getConfig('user.name'),
          this.gitService.getConfig('user.email')
        ]);
        
        const currentUser = userName.value;
        const currentEmail = userEmail.value;
        
        const branchOwnerResult = await this.branchService.getBranchOwner(currentRepo.path, currentRepo.branch);
        
        if (branchOwnerResult.owner && branchOwnerResult.email) {
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
      
      await this.gitService.addAll();
      await this.gitService.commit(message || 'WIP');
      
      // Update collaboration activity asynchronously
      if (this.updateCollaborationActivity) {
        this.updateCollaborationActivity(message || 'WIP').catch(err => {
          console.error('Failed to update collaboration activity:', err);
        });
      }
      
      try {
        await this.gitService.push();
        return { success: true, pushed: true };
      } catch (pushError: any) {
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
  },

  'git:sync': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      await this.gitService.fetch();
      await this.gitService.pull();
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Unknown error' };
    }
  },

  'git:timeTravelTo': async function(this: IPCContext, _, commitHash: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    const result = await this.gitService.timeTravelTo(commitHash);
    if (result.success && result.originalBranch) {
      this.handleBranchChange(result.originalBranch);
    }
    return result;
  },

  'git:timeTravelReturn': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    const state = this.gitService.getTimeTravelState();
    if (!state.isActive) {
      return { error: 'Not in time travel mode' };
    }
    
    const result = await this.gitService.timeTravelReturn();
    if (result.success) {
      this.handleBranchChange(state.originalBranch);
    }
    return result;
  },

  'git:push': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const remotes = await this.gitService.getRemotes(true);
      if (remotes.length === 0) {
        return { 
          error: 'No remote repository configured',
          authError: true,
          guidance: 'This repository is not connected to GitHub/GitLab. To fix this:\n\n1. Open Terminal\n2. Navigate to your project folder\n3. Run: git remote add origin [your-repository-url]\n4. Try pushing again'
        };
      }
      
      await this.gitService.push();
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
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
      
      return { 
        error: errorMessage,
        authError: false,
        guidance: 'An unexpected error occurred. You might try:\n\n1. Opening Terminal and running "git push" manually to see more details\n2. Checking if the repository is properly configured\n3. Verifying your Git installation is working'
      };
    }
  },

  'git:createBranch': async function(this: IPCContext, _, branchName: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const [userName, userEmail] = await Promise.all([
        this.gitService.getConfig('user.name'),
        this.gitService.getConfig('user.email')
      ]);
      
      await this.gitService.checkoutBranch(branchName, currentRepo.branch);
      
      if (userName.value && userEmail.value) {
        await this.branchService.recordBranchOwner(currentRepo.path, branchName, userName.value, userEmail.value);
        
        try {
          await this.gitService.addAll();
          await this.gitService.commit(`Initialize branch ownership for ${branchName}

This branch is owned by ${userName.value}
Automatically generated by Intentional`);
          
          try {
            await this.gitService.push('origin', branchName, ['--set-upstream']);
          } catch (pushError) {
            console.log('Could not push new branch:', pushError);
          }
        } catch (commitError) {
          console.log('No changes to commit for ownership file');
        }
      }
      
      this.handleBranchChange(branchName);
      return { success: true, branch: branchName };
    } catch (error: any) {
      return { error: error.message || 'Failed to create branch' };
    }
  },

  'git:switchBranch': async function(this: IPCContext, _, branchName: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      await this.gitService.checkout(branchName);
      this.handleBranchChange(branchName);
      return { success: true, branch: branchName };
    } catch (error: any) {
      return { error: error.message || 'Failed to switch branch' };
    }
  },

  'git:deleteBranch': async function(this: IPCContext, _, branchName: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      if (branchName === currentRepo.branch) {
        return { error: 'Cannot delete current branch' };
      }
      await this.gitService.deleteLocalBranch(branchName);
      return { success: true };
    } catch (error: any) {
      return { error: error.message || 'Failed to delete branch' };
    }
  },

  'git:claimBranch': async function(this: IPCContext, _, branchName: string) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const [userName, userEmail] = await Promise.all([
        this.gitService.getConfig('user.name'),
        this.gitService.getConfig('user.email')
      ]);
      
      if (userName.value && userEmail.value) {
        await this.branchService.recordBranchOwner(currentRepo.path, branchName, userName.value, userEmail.value);
        return { success: true, owner: userName.value, email: userEmail.value };
      } else {
        return { error: 'Git user not configured' };
      }
    } catch (error: any) {
      return { error: error.message || 'Failed to claim branch' };
    }
  },

  'git:getBranches': async function(this: IPCContext) {
    const currentRepo = this.getCurrentRepo();
    if (!currentRepo.path) return { error: 'No repository selected' };
    
    try {
      const branches = await this.gitService.getBranches();
      const branchDetails = await this.branchService.getAllBranchDetails(currentRepo.path);
      const teamBranchConfig = await this.branchService.loadTeamBranches(currentRepo.path);
      
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
  }
};