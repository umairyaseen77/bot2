// Amazon Job Monitor Extension - Content Script
// Production-ready version with enhanced job detection

let isMonitoring = false;
let currentJobSignatures = new Set();
let checkInterval = null;
let lastCheckTime = null;
let consolePrefix = '🔍 Amazon Job Monitor:';

// Enhanced job detection - looks for jobs after "job found" text
function findJobsAfterJobFoundText() {
  console.log(`${consolePrefix} Looking for jobs after "job found" text...`);
  
  const jobs = [];
  const jobFoundElements = document.querySelectorAll('*');
  
  // Find elements containing "job found" text
  let jobFoundElement = null;
  for (let element of jobFoundElements) {
    const text = element.textContent || '';
    if (text.includes('job found') || text.includes('Job found')) {
      jobFoundElement = element;
      console.log(`${consolePrefix} Found "job found" text:`, text.trim());
      break;
    }
  }
  
  if (!jobFoundElement) {
    console.log(`${consolePrefix} No "job found" text detected`);
    return jobs;
  }
  
  // Look for job cards after the "job found" element
  const jobSelectors = [
    '[data-test-id*="job"]',
    '[data-automation-id*="job"]',
    '.job-card',
    '.job-result',
    '.job-item',
    '.job-listing',
    '[role="article"]',
    '.css-1p32uqg', // Common Amazon job card class
    '.css-kyg8or', // Another common class
    'div[data-test-id]'
  ];
  
  // Search from the job found element downwards
  const searchContainer = jobFoundElement.closest('main, #app, body') || document.body;
  
  for (const selector of jobSelectors) {
    const elements = searchContainer.querySelectorAll(selector);
    console.log(`${consolePrefix} Found ${elements.length} elements with selector: ${selector}`);
    
    for (const element of elements) {
      const job = extractJobFromElement(element);
      if (job && job.title) {
        jobs.push(job);
        console.log(`${consolePrefix} Extracted job:`, job);
      }
    }
    
    if (jobs.length > 0) break;
  }
  
  return jobs;
}

// Enhanced job extraction from DOM elements
function extractJobFromElement(element) {
  try {
    const text = element.textContent || '';
    
    // Skip if element is too small or doesn't contain job-like content
    if (text.length < 20 || !text.includes('£')) {
      return null;
    }
    
    // Look for job title patterns
    const titleSelectors = [
      'h1, h2, h3, h4, h5, h6',
      '[data-test-id*="title"]',
      '[data-automation-id*="title"]',
      '.job-title',
      '.title',
      'a[href*="job"]',
      'strong',
      'b'
    ];
    
    let title = '';
    for (const selector of titleSelectors) {
      const titleElement = element.querySelector(selector);
      if (titleElement) {
        const titleText = titleElement.textContent.trim();
        if (titleText.length > 5 && titleText.length < 100) {
          title = titleText;
          break;
        }
      }
    }
    
    // Fallback: extract title from text patterns
    if (!title) {
      const titlePatterns = [
        /^([A-Z][a-zA-Z\s\-&()]{5,80})/,
        /([A-Z][a-zA-Z\s\-&()]+(?:Associate|Manager|Supervisor|Operative|Officer|Assistant|Specialist|Coordinator|Advisor|Representative|Analyst|Clerk|Driver|Handler|Picker|Packer|Leader|Executive))/i
      ];
      
      for (const pattern of titlePatterns) {
        const match = text.match(pattern);
        if (match) {
          title = match[1].trim();
          break;
        }
      }
    }
    
    if (!title) return null;
    
    // Extract job details
    const job = { title };
    
    // Extract pay rate
    const payPatterns = [
      /Pay rate:\s*([^£]*£[\d.,]+[^£\n]*)/i,
      /Pay:\s*([^£]*£[\d.,]+[^£\n]*)/i,
      /Salary:\s*([^£]*£[\d.,]+[^£\n]*)/i,
      /(£[\d.,]+(?:\s*-\s*£[\d.,]+)?(?:\s*per\s*hour)?)/i,
      /From\s+(£[\d.,]+)/i
    ];
    
    for (const pattern of payPatterns) {
      const match = text.match(pattern);
      if (match) {
        job.pay_rate = match[1].trim();
        break;
      }
    }
    
    // Extract location
    const locationPatterns = [
      /Location:\s*([^\n]{3,50})/i,
      /Remote location/i,
      /([A-Z][a-zA-Z\s,]+(?:location|Location))/,
      /(Remote|Office|Hybrid|On-site)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        job.location = match[1].trim();
        break;
      }
    }
    
    // Extract type
    const typePatterns = [
      /Type:\s*([^\n]{3,30})/i,
      /(Full Time|Part Time|Contract|Temporary|Permanent)/i
    ];
    
    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) {
        job.type = match[1].trim();
        break;
      }
    }
    
    // Extract duration
    const durationPatterns = [
      /Duration:\s*([^\n]{3,30})/i,
      /(Fixed-term|Permanent|Temporary|Contract)/i
    ];
    
    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        job.duration = match[1].trim();
        break;
      }
    }
    
    console.log(`${consolePrefix} Extracted job details:`, job);
    return job;
    
  } catch (error) {
    console.error(`${consolePrefix} Error extracting job:`, error);
    return null;
  }
}

// Fallback job detection methods
function detectJobsFallback() {
  console.log(`${consolePrefix} Using fallback job detection methods...`);
  
  const jobs = [];
  
  // Method 1: Text-based detection
  const textJobs = extractJobsFromText();
  jobs.push(...textJobs);
  
  // Method 2: DOM structure detection
  if (jobs.length === 0) {
    const domJobs = extractJobsFromDOM();
    jobs.push(...domJobs);
  }
  
  return jobs;
}

function extractJobsFromText() {
  const jobs = [];
  const bodyText = document.body.textContent || '';
  
  // Look for job patterns in text
  const jobPatterns = [
    /([A-Z][a-zA-Z\s\-&()]+(?:Associate|Manager|Supervisor|Operative|Officer|Assistant|Specialist|Coordinator|Advisor|Representative|Analyst|Clerk|Driver|Handler|Picker|Packer|Leader|Executive))[^£]*£[\d.,]+/gi
  ];
  
  for (const pattern of jobPatterns) {
    const matches = bodyText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const job = parseJobFromText(match);
        if (job) jobs.push(job);
      }
    }
  }
  
  return jobs;
}

function extractJobsFromDOM() {
  const jobs = [];
  const commonSelectors = [
    'article',
    '[data-test-id]',
    '[data-automation-id]',
    '.job',
    '.card',
    '.listing',
    '.result'
  ];
  
  for (const selector of commonSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const job = extractJobFromElement(element);
      if (job && job.title) {
        jobs.push(job);
      }
    }
    if (jobs.length > 0) break;
  }
  
  return jobs;
}

function parseJobFromText(text) {
  const titleMatch = text.match(/^([^£]+)/);
  const payMatch = text.match(/(£[\d.,]+(?:\s*-\s*£[\d.,]+)?)/);
  
  if (titleMatch) {
    const job = {
      title: titleMatch[1].trim()
    };
    
    if (payMatch) {
      job.pay_rate = payMatch[1].trim();
    }
    
    return job;
  }
  
  return null;
}

// Main job detection function
function detectJobs() {
  console.log(`${consolePrefix} Starting job detection...`);
  
  try {
    // Wait for page to load
    if (document.readyState !== 'complete') {
      console.log(`${consolePrefix} Page not fully loaded, waiting...`);
      return [];
    }
    
    // Primary method: Look for jobs after "job found" text
    let jobs = findJobsAfterJobFoundText();
    
    // Fallback methods if primary fails
    if (jobs.length === 0) {
      console.log(`${consolePrefix} Primary method found no jobs, trying fallback...`);
      jobs = detectJobsFallback();
    }
    
    // Remove duplicates and validate
    const uniqueJobs = [];
    const seenTitles = new Set();
    
    for (const job of jobs) {
      if (job.title && !seenTitles.has(job.title)) {
        seenTitles.add(job.title);
        uniqueJobs.push(job);
      }
    }
    
    console.log(`${consolePrefix} Found ${uniqueJobs.length} unique jobs:`, uniqueJobs);
    return uniqueJobs;
    
  } catch (error) {
    console.error(`${consolePrefix} Error in job detection:`, error);
    return [];
  }
}

// Generate job signature for duplicate detection
function generateJobSignature(job) {
  const key = `${job.title}|${job.pay_rate || ''}|${job.location || ''}`;
  return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
}

// Check for new jobs
function checkForNewJobs() {
  console.log(`${consolePrefix} Checking for new jobs...`);
  lastCheckTime = new Date().toLocaleTimeString();
  
  try {
    const currentJobs = detectJobs();
    console.log(`${consolePrefix} Current check found ${currentJobs.length} jobs`);
    
    const newJobs = [];
    
    for (const job of currentJobs) {
      const signature = generateJobSignature(job);
      
      if (!currentJobSignatures.has(signature)) {
        newJobs.push(job);
        currentJobSignatures.add(signature);
        console.log(`${consolePrefix} New job detected:`, job);
      }
    }
    
    if (newJobs.length > 0) {
      console.log(`${consolePrefix} Sending ${newJobs.length} new jobs to background`);
      
      // Send to background script for Telegram notification
      chrome.runtime.sendMessage({
        action: 'newJobs',
        jobs: newJobs,
        timestamp: Date.now()
      });
      
      // Update popup status
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        jobCount: currentJobs.length,
        newJobCount: newJobs.length,
        lastCheck: lastCheckTime
      });
    } else {
      console.log(`${consolePrefix} No new jobs found`);
      
      // Update popup status
      chrome.runtime.sendMessage({
        action: 'updateStatus',
        jobCount: currentJobs.length,
        newJobCount: 0,
        lastCheck: lastCheckTime
      });
    }
    
  } catch (error) {
    console.error(`${consolePrefix} Error checking for jobs:`, error);
    
    // Update popup with error
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      error: error.message,
      lastCheck: lastCheckTime
    });
  }
}

// Start monitoring
function startMonitoring(interval = 60000) {
  console.log(`${consolePrefix} Starting monitoring with ${interval/1000}s interval`);
  
  if (isMonitoring) {
    console.log(`${consolePrefix} Already monitoring, stopping previous session`);
    stopMonitoring();
  }
  
  isMonitoring = true;
  currentJobSignatures.clear();
  
  // Initial check
  checkForNewJobs();
  
  // Set up interval
  checkInterval = setInterval(checkForNewJobs, interval);
  
  console.log(`${consolePrefix} Monitoring started successfully`);
}

// Stop monitoring
function stopMonitoring() {
  console.log(`${consolePrefix} Stopping monitoring`);
  
  isMonitoring = false;
  
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  
  chrome.runtime.sendMessage({
    action: 'updateStatus',
    monitoring: false,
    lastCheck: lastCheckTime
  });
  
  console.log(`${consolePrefix} Monitoring stopped`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`${consolePrefix} Received message:`, request);
  
  switch (request.action) {
    case 'startMonitoring':
      startMonitoring(request.interval);
      sendResponse({ success: true });
      break;
      
    case 'stopMonitoring':
      stopMonitoring();
      sendResponse({ success: true });
      break;
      
    case 'checkNow':
      checkForNewJobs();
      sendResponse({ success: true });
      break;
      
    case 'getStatus':
      sendResponse({
        monitoring: isMonitoring,
        lastCheck: lastCheckTime,
        jobCount: currentJobSignatures.size
      });
      break;
      
    default:
      console.warn(`${consolePrefix} Unknown action:`, request.action);
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log(`${consolePrefix} Page loaded, extension ready`);
  });
} else {
  console.log(`${consolePrefix} Page already loaded, extension ready`);
}

console.log(`${consolePrefix} Content script loaded and ready`); 