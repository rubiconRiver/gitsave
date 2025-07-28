// UI Elements
const projectName = document.getElementById('projectName');
const branchName = document.getElementById('branchName');
const status = document.getElementById('status');
const saveButton = document.getElementById('saveButton');
const messageInput = document.getElementById('messageInput');
const syncButton = document.getElementById('syncButton');
const pushButton = document.getElementById('pushButton');
const branchButton = document.getElementById('branchButton');
const selectRepoButton = document.getElementById('selectRepoButton');
const quitButton = document.getElementById('quitButton');
const openFolderButton = document.getElementById('openFolderButton');
const openGithubButton = document.getElementById('openGithubButton');
const feedback = document.getElementById('feedback');

// State
let isProcessing = false;
let hasChanges = false;
let pendingCommitMessage = '';
let currentBranch = '';
let isMyBranch = true;

// Initialize
updateRepoInfo();
checkAuthentication();

// Listen for branch changes
window.electronAPI.onBranchChanged((repo) => {
  projectName.textContent = repo.name;
  branchName.textContent = repo.branch;
  currentBranch = repo.branch;
  checkBranchOwnership();
});

// Listen for git status changes
window.electronAPI.onGitStatusChanged((statusInfo) => {
  hasChanges = statusInfo.hasChanges;
  
  if (hasChanges) {
    saveButton.disabled = false;
    if (isMyBranch) {
      saveButton.textContent = `💾 Save Changes (${statusInfo.filesChanged} files)`;
      saveButton.classList.remove('not-my-branch');
    } else {
      saveButton.textContent = `Save to ${currentBranch} (${statusInfo.filesChanged} files)`;
      saveButton.classList.add('not-my-branch');
    }
    status.textContent = `${statusInfo.filesChanged} file${statusInfo.filesChanged !== 1 ? 's' : ''} changed`;
    status.classList.add('clickable');
  } else {
    saveButton.disabled = true;
    saveButton.textContent = '💾 No changes to save';
    saveButton.classList.remove('not-my-branch');
    status.textContent = 'No changes since last save';
    status.classList.remove('clickable');
  }
});

// Listen for repo loaded
window.electronAPI.onRepoLoaded((repo) => {
  projectName.textContent = repo.name;
  branchName.textContent = repo.branch;
  currentBranch = repo.branch;
  saveButton.disabled = false;
  syncButton.disabled = false;
  pushButton.disabled = false;
  checkAuthentication();
  checkBranchOwnership();
});

// Event Listeners
saveButton.addEventListener('click', handleSave);
syncButton.addEventListener('click', handleSync);
pushButton.addEventListener('click', handlePush);
branchButton.addEventListener('click', handleBranch);
selectRepoButton.addEventListener('click', handleSelectRepo);
quitButton.addEventListener('click', handleQuit);
openFolderButton.addEventListener('click', handleOpenFolder);
openGithubButton.addEventListener('click', handleOpenGithub);
status.addEventListener('click', handleShowChanges);

// Keyboard shortcut for save
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    handleSave();
  }
});

// Functions
async function updateRepoInfo() {
  try {
    const repo = await window.gitAPI.getRepoInfo();
    projectName.textContent = repo.name;
    branchName.textContent = repo.branch;
    currentBranch = repo.branch;
    
    if (repo.path) {
      saveButton.disabled = false;
      syncButton.disabled = false;
      pushButton.disabled = false;
      checkBranchOwnership();
    }
  } catch (error) {
    showError('Failed to get repository info');
  }
}

async function handleSave(forceCommit = false) {
  if (isProcessing || !hasChanges) return;
  
  isProcessing = true;
  saveButton.disabled = true;
  showStatus('Saving changes...');
  
  try {
    const message = messageInput.value.trim() || 'WIP';
    pendingCommitMessage = message;
    const result = await window.gitAPI.save(message, forceCommit);
    
    if (result.needsConfirmation) {
      // Show branch ownership modal
      showBranchOwnershipModal(result);
      isProcessing = false;
      saveButton.disabled = false;
      return;
    }
    
    if (result.success) {
      if (result.pushed) {
        showSuccess('Changes saved and pushed successfully!');
      } else {
        showWarning(result.warning || 'Changes saved locally. Push when ready.');
      }
      messageInput.value = '';
    } else {
      showError(result.error || 'Failed to save changes');
    }
  } catch (error) {
    showError('Failed to save: ' + error.message);
  } finally {
    isProcessing = false;
    // Don't re-enable if there are no changes
    if (hasChanges) {
      saveButton.disabled = false;
    }
  }
}

async function handleSync() {
  if (isProcessing) return;
  
  isProcessing = true;
  syncButton.disabled = true;
  showStatus('Syncing...');
  
  try {
    const result = await window.gitAPI.sync();
    
    if (result.success) {
      showSuccess('Synced successfully!');
    } else {
      showError(result.error || 'Failed to sync');
    }
  } catch (error) {
    showError('Failed to sync: ' + error.message);
  } finally {
    isProcessing = false;
    syncButton.disabled = false;
  }
}

async function handlePush() {
  if (isProcessing) return;
  
  isProcessing = true;
  pushButton.disabled = true;
  showStatus('Pushing...');
  
  try {
    const result = await window.gitAPI.push();
    
    if (result.success) {
      showSuccess('Pushed successfully!');
    } else {
      if (result.guidance) {
        showErrorWithGuidance(result.error || 'Failed to push', result.guidance);
      } else {
        showError(result.error || 'Failed to push');
      }
    }
  } catch (error) {
    showError('Failed to push: ' + error.message);
  } finally {
    isProcessing = false;
    pushButton.disabled = false;
  }
}

async function handleBranch() {
  try {
    await window.gitAPI.openBranches();
  } catch (error) {
    showError('Failed to open branches view: ' + error.message);
  }
}

async function handleSelectRepo() {
  try {
    const result = await window.gitAPI.selectRepo();
    
    if (result.success) {
      updateRepoInfo();
      showSuccess('Repository selected!');
    } else if (result.error) {
      showError(result.error);
    }
  } catch (error) {
    showError('Failed to select repository: ' + error.message);
  }
}

async function handleQuit() {
  try {
    await window.gitAPI.quit();
  } catch (error) {
    console.error('Failed to quit:', error);
  }
}

async function handleOpenFolder() {
  try {
    const result = await window.gitAPI.openFolder();
    if (result.error) {
      showError(result.error);
    }
  } catch (error) {
    console.error('Failed to open folder:', error);
    showError('Failed to open folder');
  }
}

async function handleOpenGithub() {
  try {
    const result = await window.gitAPI.openGithub();
    if (result.error) {
      showError(result.error);
    }
  } catch (error) {
    console.error('Failed to open GitHub:', error);
    showError('Failed to open GitHub');
  }
}

async function handleShowChanges() {
  if (!hasChanges) return;
  
  try {
    await window.gitAPI.showChanges();
  } catch (error) {
    console.error('Failed to show changes:', error);
  }
}

function showStatus(message) {
  status.textContent = message;
  feedback.innerHTML = '';
}

function showError(message) {
  status.textContent = 'Ready';
  feedback.innerHTML = `<div class="error">${message}</div>`;
  setTimeout(() => {
    feedback.innerHTML = '';
  }, 5000);
}

function showSuccess(message) {
  status.textContent = 'Ready';
  feedback.innerHTML = `<div class="success">${message}</div>`;
  setTimeout(() => {
    feedback.innerHTML = '';
  }, 3000);
}

function showWarning(message) {
  status.textContent = 'Ready';
  feedback.innerHTML = `<div class="warning">${message}</div>`;
  setTimeout(() => {
    feedback.innerHTML = '';
  }, 5000);
}

function showErrorWithGuidance(error, guidance) {
  status.textContent = 'Ready';
  const guidanceHtml = guidance.replace(/\n/g, '<br>');
  feedback.innerHTML = `
    <div class="error-with-guidance">
      <div class="error-message">${error}</div>
      <div class="error-guidance">${guidanceHtml}</div>
    </div>
  `;
  // Don't auto-hide guidance errors - user needs time to read
}

async function checkAuthentication() {
  try {
    const authInfo = await window.gitAPI.checkAuth();
    
    if (authInfo.error) {
      console.error('Failed to check authentication:', authInfo.error);
      return;
    }
    
    if (!authInfo.configured) {
      showWarning('Git configuration incomplete. Push may fail without proper setup.');
      return;
    }
    
    if (!authInfo.hasRemotes) {
      showWarning('No remote repository configured. Push will fail until you add a remote.');
      return;
    }
    
    if (authInfo.credentialHelper === 'none') {
      // Don't show warning for this - it might still work with SSH keys
      console.log('No credential helper configured, but SSH keys might be set up');
    }
  } catch (error) {
    console.error('Failed to check authentication:', error);
  }
}

// Branch ownership modal functions
function showBranchOwnershipModal(data) {
  const modal = document.getElementById('branchOwnershipModal');
  const message = document.getElementById('ownershipMessage');
  const branchInfo = document.getElementById('branchInfo');
  
  message.textContent = data.message;
  branchInfo.textContent = `Branch: ${data.currentBranch} (owned by ${data.branchOwner})`;
  
  modal.classList.add('show');
}

function hideBranchOwnershipModal() {
  document.getElementById('branchOwnershipModal').classList.remove('show');
}

// Modal button handlers
document.getElementById('cancelSaveBtn').addEventListener('click', () => {
  hideBranchOwnershipModal();
});

document.getElementById('saveAnywayBtn').addEventListener('click', async () => {
  hideBranchOwnershipModal();
  // Force save
  await handleSave(true);
});

document.getElementById('createMyBranchBtn').addEventListener('click', async () => {
  hideBranchOwnershipModal();
  
  // Generate a branch name based on current user
  const authInfo = await window.gitAPI.checkAuth();
  const userName = authInfo.userName?.toLowerCase().replace(/\s+/g, '-') || 'my';
  const baseBranch = branchName.textContent;
  const timestamp = new Date().toISOString().split('T')[0];
  const newBranchName = `${userName}/${baseBranch}-${timestamp}`;
  
  // Open branch manager with suggestion
  await window.gitAPI.openBranches();
  
  // TODO: Pass the suggested branch name to the branch manager
});

// Check branch ownership
async function checkBranchOwnership() {
  const branchOwnerEl = document.getElementById('branchOwner');
  
  if (!currentBranch || currentBranch === 'main') {
    branchOwnerEl.classList.remove('show');
    isMyBranch = true;
    return;
  }
  
  try {
    // Get current user
    const authInfo = await window.gitAPI.checkAuth();
    const currentUserEmail = authInfo.userEmail;
    
    // Get branch owner
    const ownerInfo = await window.gitAPI.getBranchOwner(currentBranch);
    
    if (ownerInfo.owner && ownerInfo.email) {
      if (ownerInfo.email === currentUserEmail) {
        // This is my branch
        branchOwnerEl.textContent = 'Your branch';
        branchOwnerEl.classList.add('show');
        branchOwnerEl.classList.remove('not-mine');
        isMyBranch = true;
      } else {
        // Someone else's branch
        branchOwnerEl.innerHTML = `${ownerInfo.owner}'s branch <span class="claim-link" id="claimLink">Claim this branch</span>`;
        branchOwnerEl.classList.add('show', 'not-mine');
        isMyBranch = false;
        
        // Add claim handler
        setTimeout(() => {
          const claimLink = document.getElementById('claimLink');
          if (claimLink) {
            claimLink.addEventListener('click', () => claimBranch(currentBranch));
          }
        }, 0);
      }
      
      // Update save button if there are changes
      if (hasChanges) {
        if (isMyBranch) {
          saveButton.classList.remove('not-my-branch');
          saveButton.textContent = saveButton.textContent.replace(/^Save to .+ \(/, '💾 Save Changes (');
        } else {
          saveButton.classList.add('not-my-branch');
          saveButton.textContent = saveButton.textContent.replace(/^💾 Save Changes/, `Save to ${currentBranch}`);
        }
      }
    } else {
      // Can't determine owner
      branchOwnerEl.classList.remove('show');
      isMyBranch = true; // Default to allowing saves
    }
  } catch (error) {
    console.error('Failed to check branch ownership:', error);
    branchOwnerEl.classList.remove('show');
    isMyBranch = true; // Default to allowing saves
  }
}

// Claim a branch as yours
async function claimBranch(branchName) {
  if (confirm(`Do you want to claim ownership of the "${branchName}" branch?`)) {
    try {
      const result = await window.gitAPI.claimBranch(branchName);
      if (result.success) {
        showSuccess(`You now own the "${branchName}" branch`);
        // Re-check ownership to update UI
        await checkBranchOwnership();
      } else {
        showError(result.error || 'Failed to claim branch');
      }
    } catch (error) {
      showError('Failed to claim branch: ' + error.message);
    }
  }
}