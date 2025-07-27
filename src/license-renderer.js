const activateBtn = document.getElementById('activateBtn');
const buyBtn = document.getElementById('buyBtn');
const emailInput = document.getElementById('email');
const licenseInput = document.getElementById('licenseKey');
const feedback = document.getElementById('feedback');

activateBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const key = licenseInput.value.trim();
  
  if (!email || !key) {
    showError('Please enter both email and license key');
    return;
  }
  
  activateBtn.disabled = true;
  activateBtn.textContent = 'Activating...';
  
  try {
    const result = await window.licenseAPI.activate(email, key);
    if (result.success) {
      showSuccess('License activated successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showError(result.error || 'Activation failed');
      activateBtn.disabled = false;
      activateBtn.textContent = 'Activate';
    }
  } catch (error) {
    showError('Activation failed: ' + error.message);
    activateBtn.disabled = false;
    activateBtn.textContent = 'Activate';
  }
});

buyBtn.addEventListener('click', () => {
  window.licenseAPI.openPurchasePage();
});

function showError(message) {
  feedback.innerHTML = `<div class="error">${message}</div>`;
}

function showSuccess(message) {
  feedback.innerHTML = `<div class="success">${message}</div>`;
}