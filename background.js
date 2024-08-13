// background.js

// Utility function to get data from local storage
function getFromStorage(key, defaultValue) {
    return browser.storage.local.get({ [key]: defaultValue }).then(result => result[key]);
}

// Utility function to set data in local storage
function setInStorage(key, value) {
    return browser.storage.local.set({ [key]: value });
}

// Function to check if the tab is in the list of blocked sites in the extension's local storage
/**
 * Checks if the current tab is in the list of blocked sites.
 *
 * @param {string} url - The URL of the current tab.
 * @returns {Promise<boolean>} - A promise that resolves to the result of the check.
 */
function isBlocked(url) {
    return getFromStorage('blockedSites', []).then(blockedSites => {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        return blockedSites.some(pattern => {
            const patternDomain = pattern.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');
            return hostname === patternDomain || hostname.endsWith(`.${patternDomain}`);
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
    const reason = message.reason;
    console.log(message);
  
    // Extract the original blocked URL from the sender's tab URL
    const urlParams = new URLSearchParams(new URL(sender.tab.url).search);
    const blockedUrl = urlParams.get('blockedUrl');
    
    if (!blockedUrl) {
      return Promise.resolve({ status: "error", message: "Blocked URL not found" });
    }
  
    const url = new URL(blockedUrl);
    const pattern = `*://*.${url.hostname}/*`;
  
    // Get the temporary unblock reasons from storage and add the new reason
    return getFromStorage('tempUnblockReasons', {})
      .then(tempUnblockReasons => {
        // Add the new reason to the list of reasons for the pattern
        const reasons = tempUnblockReasons[pattern] || [];
        reasons.push(reason);
        // Update the reasons in storage
        tempUnblockReasons[pattern] = reasons;
        return setInStorage('tempUnblockReasons', tempUnblockReasons);
      })
      .then(() => {
        // Return a success response
        return { status: "success", message: "Temporary unblock processed" };
      })
      .catch(error => {
        console.error("Error in handleTempUnblock:", error);
        return { status: "error", message: "An error occurred while processing the unblock" };
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
      return true; // This is important to indicate that we will send a response asynchronously
    }
  });