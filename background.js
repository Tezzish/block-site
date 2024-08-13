// background.js

// Utility function to get data from local storage
function getFromStorage(key, defaultValue) {
    return browser.storage.local.get({ [key]: defaultValue }).then(result => result[key]);
}

// Utility function to set data in local storage
function setInStorage(key, value) {
    return browser.storage.local.set({ [key]: value });
}

// Add a function to check if a URL is temporarily unblocked
function isTemporarilyUnblocked(url) {
  const pattern = processUrl(url);
  return getFromStorage('tempUnblocks', {})
    .then(tempUnblocks => {
      const expiryTime = tempUnblocks[pattern];
      return expiryTime && expiryTime > Date.now();
    });
}

// Function to check if the tab is in the list of blocked sites in the extension's local storage
/**
 * Checks if the current tab is in the list of blocked sites.
 *
 * @param {string} url - The URL of the current tab.
 * @returns {Promise<boolean>} - A promise that resolves to the result of the check.
 */
function isBlocked(url) {
  return isTemporarilyUnblocked(url)
    .then(isUnblocked => {
      if (isUnblocked) {
        return false;
      }
      return getFromStorage('blockedSites', []).then(blockedSites => {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        return blockedSites.some(pattern => {
          const patternDomain = pattern.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');
          return hostname === patternDomain || hostname.endsWith(`.${patternDomain}`);
        });
      });
    });
}

// Function to redirect the site if it's blocked and to show the blocked page
/**
 * Redirects the current tab to the blocked page if the site is blocked.
 *
 * @param {string} url - The URL of the current tab.
 */
function redirectIfBlocked(url) {
    isBlocked(url).then(isBlocked => {
        if (isBlocked) {
            const encodedUrl = encodeURIComponent(url);
            const blockedPageUrl = `content/blocked.html?blockedUrl=${encodedUrl}`;
            browser.tabs.update({ url: blockedPageUrl });
        }
    });
}

/**
 * Handles the temporary unblock action.
 *
 * @param {object} message - The message object containing the action and reason.
 * @param {object} sender - The sender object containing the tab information.
 * @param {function} sendResponse - The function to send a response back.
 */
function handleTempUnblock(message, sender) {
    const duration = parseInt(message.time, 10);
    const reason = message.reason;
  
    // Extract the original blocked URL from the sender's tab URL
    const urlParams = new URLSearchParams(new URL(sender.tab.url).search);
    const blockedUrl = urlParams.get('blockedUrl');
    
    if (!blockedUrl) {
      return Promise.resolve({ status: "error", message: "Blocked URL not found" });
    }
  
    const pattern = processUrl(blockedUrl);
  
    return Promise.all([
      addToTempUnblocked(pattern, duration),
      addToTempUnblockedReasons(pattern, reason, duration)
    ])
    .then(() => ({ status: "success", message: "Temporary unblock processed" }))
    .catch(error => {
      console.error("Error in handleTempUnblock:", error);
      return { status: "error", message: "An error occurred while processing the unblock" };
    });
}

// function for adding a URL to the list of temporarily unblocked sites
function addToTempUnblocked(url, duration) {
  const expiryTime = Date.now() + duration * 60 * 1000;
  return getFromStorage('tempUnblocks', {})
    .then(tempUnblocks => {
      tempUnblocks[url] = expiryTime;
      return setInStorage('tempUnblocks', tempUnblocks);
    })
    .then(() => {
      return browser.alarms.create(url, { when: expiryTime });
    })
    .catch(error => {
      console.error("Error in addToTempUnblocked:", error);
    });
}

// function for adding a temp unblocked reason to the list of reasons
function addToTempUnblockedReasons(url, reason, duration) {
  const tuple = [reason, duration];
  return getFromStorage('tempUnblockReasons', {})
    .then(tempUnblockReasons => {
      const reasons = tempUnblockReasons[url] || [];
      reasons.push(tuple);
      console.log(tuple);
      tempUnblockReasons[url] = reasons;
      return setInStorage('tempUnblockReasons', tempUnblockReasons);
    })
    .catch(error => {
      console.error("Error in addToTempUnblockedReasons:", error);
    });
}

// Add a listener for tab updates to redirect if the URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        redirectIfBlocked(changeInfo.url);
    }
});

// Add a listener for messages sent from other parts of the extension
// In your message listener
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "tempUnblock") {
      handleTempUnblock(message, sender)
        .then(sendResponse)
        .catch(error => {
          console.error("Error in message listener:", error);
          sendResponse({ status: "error", message: "An unexpected error occurred" });
        });
      return true;
    }
  });

browser.alarms.onAlarm.addListener(handleAlarm);

// Function to handle alarm
function handleAlarm(alarm) {
  const pattern = alarm.name;
  
  // Remove from tempUnblocks
  getFromStorage('tempUnblocks', {})
    .then(tempUnblocks => {
      if (tempUnblocks[pattern]) {
        delete tempUnblocks[pattern];
        return setInStorage('tempUnblocks', tempUnblocks);
      }
    })
    .catch(error => {
      console.error("Error in handleAlarm:", error);
    });
}

function processUrl(url) {
  const urlObj = new URL(url);
  return `*://*.${urlObj.hostname}/*`;
}