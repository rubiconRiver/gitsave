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
const signOutButton = document.getElementById('signOutButton');
const feedback = document.getElementById('feedback');

// State
let isProcessing = false;

// Initialize
updateRepoInfo();

// Event Listeners
saveButton.addEventListener('click', handleSave);
syncButton.addEventListener('click', handleSync);
pushButton.addEventListener('click', handlePush);
selectRepoButton.addEventListener('click', handleSelectRepo);

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
    
    if (repo.path) {
      saveButton.disabled = false;
      syncButton.disabled = false;
      pushButton.disabled = false;
    }
  } catch (error) {
    showError('Failed to get repository info');
  }
}

async function handleSave() {
  if (isProcessing) return;
  
  isProcessing = true;
  saveButton.disabled = true;
  showStatus('Saving changes...');
  
  try {
    const message = messageInput.value.trim() || 'WIP';
    const result = await window.gitAPI.save(message);
    
    if (result.success) {
      showSuccess('Changes saved successfully!');
      messageInput.value = '';
    } else {
      showError(result.error || 'Failed to save changes');
    }
  } catch (error) {
    showError('Failed to save: ' + error.message);
  } finally {
    isProcessing = false;
    saveButton.disabled = false;
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
      showError(result.error || 'Failed to push');
    }
  } catch (error) {
    showError('Failed to push: ' + error.message);
  } finally {
    isProcessing = false;
    pushButton.disabled = false;
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