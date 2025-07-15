// Amazon Job Monitor Extension - Popup Script
// Production-ready version with pre-configured Telegram bot

// Production Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7365607345:AAF4aqIQzExTh7bYESwv_KsOrceCwCgvnL0';

// DOM Elements
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const checkNowBtn = document.getElementById('checkNowBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsDiv = document.getElementById('settings');
const saveSettingsBtn = document.getElementById('saveSettings');
const botTokenInput = document.getElementById('botToken');
const chatIdInput = document.getElementById('chatId');
const refreshIntervalInput = document.getElementById('refreshInterval');
const testTelegramBtn = document.getElementById('testTelegram');

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Popup loaded');
  
  // Pre-fill bot token
  botTokenInput.value = TELEGRAM_BOT_TOKEN;
  
  // Load settings
  await loadSettings();
  
  // Update status
  await updateStatus();
  
  // Set up event listeners
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'botToken',
      'chatId', 
      'refreshInterval'
    ]);
    
    // Use pre-configured bot token if none saved
    botTokenInput.value = settings.botToken || TELEGRAM_BOT_TOKEN;
    chatIdInput.value = settings.chatId || '';
    refreshIntervalInput.value = settings.refreshInterval || 60;
    
    console.log('✅ Settings loaded');
  } catch (error) {
    console.error('❌ Error loading settings:', error);
    showError('Failed to load settings');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      botToken: botTokenInput.value.trim(),
      chatId: chatIdInput.value.trim(),
      refreshInterval: parseInt(refreshIntervalInput.value)
    };
    
    // Validate settings
    if (!settings.botToken) {
      showError('Please enter bot token');
      return;
    }
    
    if (!settings.chatId) {
      showError('Please enter chat ID');
      return;
    }
    
    if (settings.refreshInterval < 15) {
      showError('Refresh interval must be at least 15 seconds');
      return;
    }
    
    await chrome.storage.sync.set(settings);
    
    showSuccess('Settings saved successfully!');
    settingsDiv.style.display = 'none';
    
    console.log('✅ Settings saved:', settings);
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    showError('Failed to save settings');
  }
}

// Update status display
async function updateStatus() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('jobsatamazon.co.uk')) {
      statusDiv.innerHTML = `
        <div class="status-item">
          <span class="status-label">Status:</span>
          <span class="status-value error">❌ Not on Amazon Jobs page</span>
        </div>
        <div class="status-item">
          <span class="status-label">Action:</span>
          <span class="status-value">Please navigate to Amazon Jobs</span>
        </div>
      `;
      
      startBtn.disabled = true;
      stopBtn.disabled = true;
      checkNowBtn.disabled = true;
      return;
    }
    
    // Get status from content script
    chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting status:', chrome.runtime.lastError);
        statusDiv.innerHTML = `
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value error">❌ Extension not loaded</span>
          </div>
          <div class="status-item">
            <span class="status-label">Action:</span>
            <span class="status-value">Please refresh the page</span>
          </div>
        `;
        return;
      }
      
      if (response) {
        const { monitoring, lastCheck, jobCount } = response;
        
        statusDiv.innerHTML = `
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value ${monitoring ? 'success' : 'error'}">${monitoring ? '✅ Running' : '❌ Stopped'}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Last Check:</span>
            <span class="status-value">${lastCheck || 'Never'}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Jobs Found:</span>
            <span class="status-value">${jobCount || 0}</span>
          </div>
        `;
        
        // Update button states
        startBtn.disabled = monitoring;
        stopBtn.disabled = !monitoring;
        checkNowBtn.disabled = false;
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    statusDiv.innerHTML = `
      <div class="status-item">
        <span class="status-label">Status:</span>
        <span class="status-value error">❌ Error</span>
      </div>
    `;
  }
}

// Setup event listeners
function setupEventListeners() {
  startBtn.addEventListener('click', startMonitoring);
  stopBtn.addEventListener('click', stopMonitoring);
  checkNowBtn.addEventListener('click', checkNow);
  settingsBtn.addEventListener('click', toggleSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  testTelegramBtn.addEventListener('click', testTelegram);
  
  // Auto-refresh status every 5 seconds
  setInterval(updateStatus, 5000);
}

// Start monitoring
async function startMonitoring() {
  try {
    showInfo('Starting job monitoring...');
    
    // Get settings
    const settings = await chrome.storage.sync.get(['refreshInterval']);
    const interval = (settings.refreshInterval || 60) * 1000;
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send start message to content script
    chrome.tabs.sendMessage(tab.id, { 
      action: 'startMonitoring',
      interval: interval
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting monitoring:', chrome.runtime.lastError);
        showError('Failed to start monitoring. Please refresh the page.');
        return;
      }
      
      if (response && response.success) {
        showSuccess('Monitoring started successfully!');
        updateStatus();
      } else {
        showError('Failed to start monitoring');
      }
    });
    
  } catch (error) {
    console.error('❌ Error starting monitoring:', error);
    showError('Failed to start monitoring');
  }
}

// Stop monitoring
async function stopMonitoring() {
  try {
    showInfo('Stopping job monitoring...');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send stop message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'stopMonitoring' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error stopping monitoring:', chrome.runtime.lastError);
        showError('Failed to stop monitoring');
        return;
      }
      
      if (response && response.success) {
        showSuccess('Monitoring stopped successfully!');
        updateStatus();
      } else {
        showError('Failed to stop monitoring');
      }
    });
    
  } catch (error) {
    console.error('❌ Error stopping monitoring:', error);
    showError('Failed to stop monitoring');
  }
}

// Check for jobs now
async function checkNow() {
  try {
    showInfo('Checking for jobs...');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send check message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'checkNow' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking now:', chrome.runtime.lastError);
        showError('Failed to check for jobs');
        return;
      }
      
      if (response && response.success) {
        showSuccess('Job check completed!');
        updateStatus();
      } else {
        showError('Failed to check for jobs');
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking now:', error);
    showError('Failed to check for jobs');
  }
}

// Toggle settings visibility
function toggleSettings() {
  if (settingsDiv.style.display === 'none') {
    settingsDiv.style.display = 'block';
    settingsBtn.textContent = '⬆️ Hide Settings';
  } else {
    settingsDiv.style.display = 'none';
    settingsBtn.textContent = '⚙️ Settings';
  }
}

// Test Telegram bot
async function testTelegram() {
  try {
    const botToken = botTokenInput.value.trim();
    const chatId = chatIdInput.value.trim();
    
    if (!botToken || !chatId) {
      showError('Please enter both bot token and chat ID');
      return;
    }
    
    showInfo('Testing Telegram bot...');
    
    const testMessage = `🧪 <b>Test Message</b>

Your Amazon Job Monitor is working!

📋 You'll receive notifications like this:

💼 <b>Customer Service Associate</b>
📅 Type: Full Time
💰 Pay: From £14.05
📍 Location: Remote

🔗 <a href="https://www.jobsatamazon.co.uk/app#/jobSearch">Apply Now</a>

✅ Setup complete! 🚀`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML'
      })
    });
    
    if (response.ok) {
      showSuccess('✅ Test message sent! Check your Telegram!');
    } else {
      const error = await response.json();
      showError(`❌ Test failed: ${error.description || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Telegram:', error);
    showError('Failed to test Telegram bot');
  }
}

// Show success message
function showSuccess(message) {
  showNotification(message, 'success');
}

// Show error message
function showError(message) {
  showNotification(message, 'error');
}

// Show info message
function showInfo(message) {
  showNotification(message, 'info');
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(n => n.remove());
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to popup
  document.body.insertBefore(notification, document.body.firstChild);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Popup received message:', request);
  
  switch (request.action) {
    case 'updateStatus':
      updateStatus();
      break;
      
    case 'newJobsFound':
      showSuccess(`🎉 Found ${request.count} new jobs!`);
      updateStatus();
      break;
      
    case 'notificationSent':
      showSuccess('✅ Telegram notification sent!');
      break;
      
    case 'notificationFailed':
      showError('❌ Telegram notification failed');
      break;
  }
});

// Auto-get chat ID helper
async function autoGetChatId() {
  try {
    const botToken = botTokenInput.value.trim();
    
    if (!botToken) {
      showError('Please enter bot token first');
      return;
    }
    
    showInfo('Getting chat ID... Please send a message to your bot first!');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
    const data = await response.json();
    
    if (data.ok && data.result && data.result.length > 0) {
      const latestMessage = data.result[data.result.length - 1];
      const chatId = latestMessage.message.chat.id;
      
      chatIdInput.value = chatId;
      showSuccess(`✅ Chat ID found: ${chatId}`);
    } else {
      showError('No messages found. Please send a message to your bot first!');
    }
    
  } catch (error) {
    console.error('❌ Error getting chat ID:', error);
    showError('Failed to get chat ID');
  }
}

// Add auto-get chat ID button if it doesn't exist
if (!document.getElementById('getChatIdBtn')) {
  const getChatIdBtn = document.createElement('button');
  getChatIdBtn.id = 'getChatIdBtn';
  getChatIdBtn.textContent = '🔍 Auto-Get Chat ID';
  getChatIdBtn.className = 'btn btn-secondary';
  getChatIdBtn.style.marginTop = '5px';
  getChatIdBtn.addEventListener('click', autoGetChatId);
  
  // Insert after chat ID input
  chatIdInput.parentNode.insertBefore(getChatIdBtn, chatIdInput.nextSibling);
} 