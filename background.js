// Amazon Job Monitor Extension - Background Script
// Production-ready version with enhanced Telegram integration

// Production Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7365607345:AAF4aqIQzExTh7bYESwv_KsOrceCwCgvnL0';

console.log('🚀 Amazon Job Monitor Background Script Loaded');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request);
  
  switch (request.action) {
    case 'newJobs':
      handleNewJobs(request.jobs, request.timestamp);
      break;
      
    case 'updateStatus':
      updateExtensionBadge(request);
      break;
      
    case 'testTelegram':
      testTelegramBot(request.botToken, request.chatId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
      
    default:
      console.warn('🔍 Unknown action:', request.action);
  }
});

// Handle new jobs found
async function handleNewJobs(jobs, timestamp) {
  console.log(`🎉 Processing ${jobs.length} new jobs:`, jobs);
  
  try {
    // Get Telegram settings
    const settings = await chrome.storage.sync.get(['botToken', 'chatId']);
    const botToken = settings.botToken || TELEGRAM_BOT_TOKEN;
    const chatId = settings.chatId;
    
    if (!botToken || !chatId) {
      console.warn('⚠️ Telegram not configured - skipping notification');
      return;
    }
    
    // Send Telegram notification
    const notificationSent = await sendTelegramNotification(jobs, botToken, chatId);
    
    if (notificationSent) {
      console.log('✅ Telegram notification sent successfully');
      
      // Notify popup
      try {
        chrome.runtime.sendMessage({
          action: 'notificationSent',
          jobCount: jobs.length
        });
      } catch (e) {
        console.log('Popup not available to notify');
      }
    } else {
      console.error('❌ Failed to send Telegram notification');
      
      // Notify popup of failure
      try {
        chrome.runtime.sendMessage({
          action: 'notificationFailed',
          jobCount: jobs.length
        });
      } catch (e) {
        console.log('Popup not available to notify');
      }
    }
    
    // Update extension badge
    updateExtensionBadge({
      monitoring: true,
      newJobCount: jobs.length
    });
    
  } catch (error) {
    console.error('❌ Error handling new jobs:', error);
  }
}

// Send Telegram notification
async function sendTelegramNotification(jobs, botToken, chatId) {
  try {
    console.log(`📤 Sending Telegram notification for ${jobs.length} jobs`);
    
    const message = formatTelegramMessage(jobs);
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Telegram API response:', data);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Telegram API error:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error);
    return false;
  }
}

// Format message for Telegram
function formatTelegramMessage(jobs) {
  const timestamp = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  let message = '';
  
  if (jobs.length === 1) {
    const job = jobs[0];
    message = `🎉 <b>NEW AMAZON JOB FOUND!</b>

📋 <b>${job.title}</b>`;
    
    if (job.type) {
      message += `\n📅 Type: ${job.type}`;
    }
    
    if (job.duration) {
      message += `\n⏱️ Duration: ${job.duration}`;
    }
    
    if (job.pay_rate) {
      message += `\n💰 Pay: ${job.pay_rate}`;
    }
    
    if (job.location) {
      message += `\n📍 Location: ${job.location}`;
    }
    
    message += `\n\n🔗 <a href="https://www.jobsatamazon.co.uk/app#/jobSearch">Apply Now</a>`;
    message += `\n⏰ Found: ${timestamp}`;
    
  } else {
    message = `🎉 <b>${jobs.length} NEW AMAZON JOBS FOUND!</b>

`;
    
    jobs.forEach((job, index) => {
      message += `📋 <b>Job ${index + 1}: ${job.title}</b>\n`;
      
      if (job.pay_rate) {
        message += `💰 ${job.pay_rate}\n`;
      }
      
      if (job.location) {
        message += `📍 ${job.location}\n`;
      }
      
      message += '\n';
    });
    
    message += `🔗 <a href="https://www.jobsatamazon.co.uk/app#/jobSearch">Apply Now</a>`;
    message += `\n⏰ Found: ${timestamp}`;
  }
  
  return message;
}

// Update extension badge
function updateExtensionBadge(status) {
  try {
    let badgeText = '';
    let badgeColor = '#808080'; // Gray default
    
    if (status.monitoring) {
      badgeText = 'ON';
      badgeColor = '#4CAF50'; // Green
      
      if (status.newJobCount > 0) {
        badgeText = status.newJobCount.toString();
        badgeColor = '#FF5722'; // Orange for new jobs
      }
    } else {
      badgeText = 'OFF';
      badgeColor = '#F44336'; // Red
    }
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    
    console.log(`🏷️ Badge updated: ${badgeText} (${badgeColor})`);
    
  } catch (error) {
    console.error('❌ Error updating badge:', error);
  }
}

// Test Telegram bot
async function testTelegramBot(botToken, chatId) {
  try {
    console.log('🧪 Testing Telegram bot...');
    
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
      console.log('✅ Telegram test successful');
      return { success: true, message: 'Test message sent successfully!' };
    } else {
      const error = await response.json();
      console.error('❌ Telegram test failed:', error);
      return { success: false, message: error.description || 'Unknown error' };
    }
    
  } catch (error) {
    console.error('❌ Error testing Telegram:', error);
    return { success: false, message: error.message };
  }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🔧 Extension installed/updated');
  
  // Set initial badge
  updateExtensionBadge({ monitoring: false });
  
  // Set up default settings with production bot token
  chrome.storage.sync.get(['botToken'], (result) => {
    if (!result.botToken) {
      chrome.storage.sync.set({
        botToken: TELEGRAM_BOT_TOKEN,
        refreshInterval: 60
      });
      console.log('📝 Default settings initialized');
    }
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension started');
  updateExtensionBadge({ monitoring: false });
});

// Handle tab updates to manage badge
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('jobsatamazon.co.uk')) {
    console.log('📄 Amazon Jobs page loaded');
    
    // Reset badge when navigating to Amazon Jobs
    updateExtensionBadge({ monitoring: false });
  }
});

// Cleanup on extension shutdown
chrome.runtime.onSuspend.addListener(() => {
  console.log('💤 Extension suspending');
});

// Handle alarm events (for future scheduled checks)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('⏰ Alarm triggered:', alarm.name);
  
  if (alarm.name === 'jobCheck') {
    // Future enhancement: scheduled job checking
    console.log('🔍 Scheduled job check triggered');
  }
});

// Error handling for unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

console.log('✅ Background script initialized and ready'); 