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
let isInitialLoad = true;
let loadingTimeout = null;

// Initialize
// Add a small delay and loading state for initial load
showLoadingState();
setTimeout(() => {
  updateRepoInfo();
  checkAuthentication();
  // Clear loading state after 3 seconds max
  loadingTimeout = setTimeout(() => {
    isInitialLoad = false;
  }, 3000);
}, 100);

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
      saveButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Changes (${statusInfo.filesChanged} files)
      `;
      saveButton.classList.remove('not-my-branch');
    } else {
      saveButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save to ${currentBranch} (${statusInfo.filesChanged} files)
      `;
      saveButton.classList.add('not-my-branch');
    }
    status.textContent = `${statusInfo.filesChanged} file${statusInfo.filesChanged !== 1 ? 's' : ''} changed`;
    status.classList.add('clickable');
    status.classList.add('has-changes');
  } else {
    saveButton.disabled = true;
    saveButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      No changes to save
    `;
    saveButton.classList.remove('not-my-branch');
    status.textContent = 'No changes since last save';
    status.classList.remove('clickable');
    status.classList.remove('has-changes');
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
    
    // Clear loading state on successful load
    if (isInitialLoad) {
      isInitialLoad = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      clearLoadingState();
    }
    
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
    // Only show error if not initial load
    if (!isInitialLoad) {
      showError('Failed to get repository info');
    }
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
    
    // Only show warnings after initial load
    if (!isInitialLoad) {
      if (!authInfo.configured) {
        showWarning('Git configuration incomplete. Push may fail without proper setup.');
        return;
      }
      
      if (!authInfo.hasRemotes) {
        showWarning('No remote repository configured. Push will fail until you add a remote.');
        return;
      }
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

// Collaboration state
let collaborationData = null;

// Load collaboration panel
async function loadCollaborationPanel() {
  try {
    const container = document.getElementById('collaboration-container');
    if (!container) {
      console.error('Collaboration container not found');
      return;
    }
    
    // Load the collaboration HTML
    const response = await fetch('collaboration/collaboration.html');
    const html = await response.text();
    container.innerHTML = html;
    
    // Initialize collaboration features
    initializeCollaboration();
  } catch (error) {
    console.error('Failed to load collaboration panel:', error);
  }
}

function initializeCollaboration() {
  // Set up collapsible sections
  const headers = document.querySelectorAll('.collab-section-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('expanded');
    });
    // Start with all sections expanded
    header.classList.add('expanded');
  });
  
  // Refresh button
  const refreshBtn = document.getElementById('collab-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshCollaboration();
    });
  }
  
  // Add task button
  const addTaskBtn = document.getElementById('add-task-btn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      showAddTaskDialog();
    });
  }
  
  // Load real data
  loadCollaborationData();
}

async function loadCollaborationData() {
  try {
    // Load user's own collaboration data
    const result = await window.collabAPI.read();
    if (result.success) {
      collaborationData = result.data;
      renderCollaborationData();
    }
    
    // Load team data
    const teamResult = await window.collabAPI.readTeam();
    if (teamResult.success) {
      renderTeamData(teamResult.data);
    }
  } catch (error) {
    console.error('Failed to load collaboration data:', error);
  }
}

function renderCollaborationData() {
  if (!collaborationData) return;
  
  // Render goals
  const goalsContainer = document.getElementById('project-goals');
  if (goalsContainer && collaborationData.goals) {
    if (collaborationData.goals.length === 0) {
      goalsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📌</div>No project goals set</div>';
    } else {
      goalsContainer.innerHTML = collaborationData.goals.map(goal => `
        <div class="goal-item" data-goal-id="${goal.id}">
          <div class="goal-text">${escapeHtml(goal.title)}</div>
        </div>
      `).join('');
    }
  }
  
  // Render builds
  const buildsContainer = document.getElementById('recent-builds');
  if (buildsContainer && collaborationData.builds) {
    if (collaborationData.builds.length === 0) {
      buildsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏗️</div>No recent builds</div>';
    } else {
      buildsContainer.innerHTML = collaborationData.builds.map(build => `
        <div class="build-item">
          <div class="build-info">
            <div class="build-version">${escapeHtml(build.version)}</div>
            <div class="build-time">${formatTime(build.timestamp)} by ${escapeHtml(build.author)}</div>
          </div>
          <span class="build-status ${build.status}">${build.status}</span>
        </div>
      `).join('');
    }
  }
  
  // Render my tasks (tasks assigned by me to others)
  const myTasksContainer = document.getElementById('my-tasks');
  const myTaskCount = document.getElementById('my-task-count');
  if (myTasksContainer && collaborationData.tasks) {
    const myTasks = collaborationData.tasks.filter(task => task.assignedBy === collaborationData.username);
    if (myTasks.length === 0) {
      myTasksContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div>No tasks assigned by you</div>';
    } else {
      myTasksContainer.innerHTML = myTasks.map(task => `
        <div class="task-item" data-task-id="${task.id}">
          <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
          <div class="task-content">
            <div class="task-text">${escapeHtml(task.title)}</div>
            <div class="task-assignee">To: ${escapeHtml(task.assignee)}</div>
          </div>
        </div>
      `).join('');
    }
    if (myTaskCount) {
      myTaskCount.textContent = myTasks.length > 0 ? myTasks.length.toString() : '';
    }
  }
}

function renderTeamData(teamMembers) {
  // Render team tasks (tasks assigned to me by others)
  const teamTasksContainer = document.getElementById('team-tasks');
  const teamTaskCount = document.getElementById('team-task-count');
  
  if (teamTasksContainer) {
    const allTeamTasks = [];
    teamMembers.forEach(member => {
      if (member.tasks) {
        const tasksForMe = member.tasks.filter(task => 
          task.assignee === 'Garett' || task.assignee === collaborationData?.username
        );
        allTeamTasks.push(...tasksForMe.map(task => ({ ...task, fromMember: member.username })));
      }
    });
    
    if (allTeamTasks.length === 0) {
      teamTasksContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div>No tasks assigned to you</div>';
    } else {
      teamTasksContainer.innerHTML = allTeamTasks.map(task => `
        <div class="task-item team-task" data-task-id="${task.id}" data-from="${task.fromMember}">
          <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" onclick="toggleTeamTask('${task.id}', '${task.fromMember}')"></div>
          <div class="task-content">
            <div class="task-text">${escapeHtml(task.title)}</div>
            <div class="task-assignee for-me">From: ${escapeHtml(task.assignedBy)}</div>
          </div>
        </div>
      `).join('');
    }
    if (teamTaskCount) {
      teamTaskCount.textContent = allTeamTasks.length > 0 ? allTeamTasks.length.toString() : '';
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

// Task management functions
window.toggleTask = async function(taskId) {
  if (!collaborationData) return;
  
  const task = collaborationData.tasks.find(t => t.id === taskId);
  if (task) {
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.updatedAt = new Date().toISOString();
    
    // Save changes
    const result = await window.collabAPI.write(collaborationData);
    if (result.success) {
      renderCollaborationData();
    }
  }
};

window.toggleTeamTask = async function(taskId, fromMember) {
  // For team tasks, we'd need to implement a way to update the other person's file
  // For now, just show a message
  console.log('Toggle team task:', taskId, 'from:', fromMember);
  alert('Team task status updates coming soon!');
};

function loadMockCollaborationData() {
  // Keeping the old function for reference, but not using it
  // Mock goals
  const goalsContainer = document.getElementById('project-goals');
  if (goalsContainer) {
    goalsContainer.innerHTML = `
      <div class="goal-item">
        <div class="goal-text">Launch v1.0 with full collaboration features</div>
      </div>
      <div class="goal-item">
        <div class="goal-text">Implement real-time sync using git branches</div>
      </div>
    `;
  }
  
  // Mock tasks
  const myTasksContainer = document.getElementById('my-tasks');
  const myTaskCount = document.getElementById('my-task-count');
  if (myTasksContainer) {
    myTasksContainer.innerHTML = `
      <div class="task-item">
        <div class="task-checkbox" data-task-id="1"></div>
        <div class="task-content">
          <div class="task-text">Design logo for Intentional</div>
          <div class="task-assignee">From: Garett</div>
        </div>
      </div>
    `;
  }
  if (myTaskCount) {
    myTaskCount.textContent = '1';
  }
  
  // Mock team tasks
  const teamTasksContainer = document.getElementById('team-tasks');
  const teamTaskCount = document.getElementById('team-task-count');
  if (teamTasksContainer) {
    teamTasksContainer.innerHTML = `
      <div class="task-item">
        <div class="task-checkbox" data-task-id="2"></div>
        <div class="task-content">
          <div class="task-text">Test collaboration sync on Windows</div>
          <div class="task-assignee">For: Garett</div>
        </div>
      </div>
    `;
  }
  if (teamTaskCount) {
    teamTaskCount.textContent = '1';
  }
  
  // Mock builds
  const buildsContainer = document.getElementById('recent-builds');
  if (buildsContainer) {
    buildsContainer.innerHTML = `
      <div class="build-item">
        <div class="build-info">
          <div class="build-version">v0.8.0</div>
          <div class="build-time">2h ago by Garett</div>
        </div>
        <span class="build-status success">success</span>
      </div>
    `;
  }
}

async function refreshCollaboration() {
  const refreshBtn = document.getElementById('collab-refresh');
  if (refreshBtn) {
    // Add spinning animation
    refreshBtn.style.animation = 'spin 1s linear infinite';
  }
  
  // Reload collaboration data
  await loadCollaborationData();
  
  if (refreshBtn) {
    refreshBtn.style.animation = '';
  }
}

// Task dialog functions
async function showAddTaskDialog() {
  // Check if dialog already exists
  let modal = document.getElementById('add-task-modal');
  if (!modal) {
    // Load dialog HTML
    const response = await fetch('collaboration/add-task-dialog.html');
    const html = await response.text();
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);
    modal = document.getElementById('add-task-modal');
  }
  
  // Show modal
  modal.classList.add('show');
  
  // Focus on title input
  setTimeout(() => {
    document.getElementById('task-title').focus();
  }, 100);
}

window.closeAddTaskDialog = function() {
  const modal = document.getElementById('add-task-modal');
  if (modal) {
    modal.classList.remove('show');
    // Clear form
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-priority').value = 'medium';
  }
};

window.createTask = async function() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) {
    alert('Please enter a task title');
    return;
  }
  
  const newTask = {
    id: `task-${Date.now()}`,
    title: title,
    description: document.getElementById('task-description').value.trim(),
    assignee: document.getElementById('task-assignee').value,
    assignedBy: collaborationData?.username || 'Garett',
    status: 'pending',
    priority: document.getElementById('task-priority').value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to collaboration data
  if (!collaborationData) {
    collaborationData = {
      username: 'garett',
      email: 'garett.gelsinger@gmail.com',
      tasks: [],
      goals: [],
      builds: [],
      updates: []
    };
  }
  
  if (!collaborationData.tasks) {
    collaborationData.tasks = [];
  }
  
  collaborationData.tasks.push(newTask);
  
  // Save
  const result = await window.collabAPI.write(collaborationData);
  if (result.success) {
    closeAddTaskDialog();
    renderCollaborationData();
  } else {
    alert('Failed to create task: ' + (result.error || 'Unknown error'));
  }
};

// Loading state functions
function showLoadingState() {
  projectName.innerHTML = '<span class="loading-text">Loading...</span>';
  branchName.classList.add('loading-text');
  feedback.innerHTML = '<span style="color: var(--text-secondary); font-size: 12px; opacity: 0.8;">Initializing Intentional...</span>';
  feedback.className = '';
}

function clearLoadingState() {
  feedback.textContent = '';
  feedback.className = '';
  branchName.classList.remove('loading-text');
}

// Load collaboration panel on startup
loadCollaborationPanel();