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

// Function to handle temporary unblock requests
/**
 * Handles the temporary unblock action.
 *
 * @param {object} message - The message object containing the action and reason.
 * @param {object} sender - The sender object containing the tab information.
 * @param {function} sendResponse - The function to send a response back.
 */
function handleTempUnblock(message, sender, sendResponse) {
    const reason = message.reason;
    // Extract the original blocked URL from the sender's tab URL
    const urlParams = new URLSearchParams(new URL(sender.tab.url).search);
    const blockedUrl = urlParams.get('blockedUrl');
    if (!blockedUrl) {
        sendResponse({ status: "error", message: "Blocked URL not found" });
        return;
    }
    const url = new URL(blockedUrl);
    const pattern = `*://*.${url.hostname}/*`;

    getFromStorage('tempUnblockReasons', {}).then(tempUnblockReasons => {
        const reasons = tempUnblockReasons[pattern] || [];
        reasons.push(reason);
        tempUnblockReasons[pattern] = reasons;
        return setInStorage('tempUnblockReasons', tempUnblockReasons);
    }).then(() => {
        sendResponse({ status: "success", message: "Temporary unblock processed" });
    });
    return true; // Return true to indicate you want to send a response asynchronously
}

// Add a listener for tab updates to redirect if the URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        redirectIfBlocked(changeInfo.url);
    }
});

// Add a listener for messages sent from other parts of the extension
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "tempUnblock") {
        return handleTempUnblock(message, sender, sendResponse);
    }
});