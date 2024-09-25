import { getFromStorage, setInStorage, processUrl } from './utils/utils.js';

// Utility Functions
// -----------------

/**
 * Checks if a URL is temporarily unblocked.
 *
 * @param {string} url - The URL to check.
 * @returns {Promise<boolean>} - A promise that resolves to true if the URL is temporarily unblocked.
 */
async function isTemporarilyUnblocked(url) {
  const pattern = processUrl(url);
  const tempUnblocks = await getFromStorage('tempUnblocks', new Map());
  const expiryTime = tempUnblocks.get(pattern);
  return expiryTime && expiryTime > Date.now();
}

/**
 * Checks if the current tab is in the list of blocked sites.
 *
 * @param {string} url - The URL of the current tab.
 * @returns {Promise<boolean>} - A promise that resolves to the result of the check.
 */
async function isBlocked(url) {
  const isUnblocked = await isTemporarilyUnblocked(url);
  if (isUnblocked) {
    return false;
  }
  const blockedSites = await getFromStorage('blockedSites', new Map());
  const pattern = processUrl(url);
  return blockedSites.has(pattern);
}

/**
 * Redirects the current tab to the blocked page if the site is blocked.
 *
 * @param {string} url - The URL of the current tab.
 */
async function redirectIfBlocked(url) {
  isBlocked(url).then(isBlocked => {
    if (isBlocked) {
      const encodedUrl = encodeURIComponent(url);
      const blockedPageUrl = `content/blocked.html?blockedUrl=${encodedUrl}`;
      browser.tabs.update({ url: blockedPageUrl });
    }
  });
}

// Temporary Unblock Functions
// ---------------------------

/**
 * Handles the temporary unblock action.
 *
 * @param {object} message - The message object containing the action and reason.
 * @param {object} sender - The sender object containing the tab information.
 * @returns {Promise<object>} - A promise that resolves to the result of the unblock action.
 */
async function handleTempUnblock(message, sender) {
  try {
    const storedPassphrase = await getFromStorage("Passphrase");
    if (message.passphrase !== storedPassphrase) {
      return { status: "error", message: "Incorrect passphrase" };
    }

    const duration = parseInt(message.duration, 10);
    const reason = message.reason;
    const urlParams = new URLSearchParams(new URL(sender.tab.url).search);
    const blockedUrl = urlParams.get('blockedUrl');

    if (!blockedUrl) {
      return { status: "error", message: "Blocked URL not found" };
    }

    const pattern = processUrl(blockedUrl);
    await Promise.all([
      addToTempUnblocked(pattern, duration),
      addToTempUnblockedReasons(pattern, reason, duration)
    ]);

    return { status: "success", message: "Temporary unblock processed" };
  } catch (error) {
    console.error("Error in handleTempUnblock:", error);
    return { status: "error", message: "An error occurred while processing the unblock" };
  }
}

/**
 * Adds a URL to the list of temporarily unblocked sites.
 *
 * @param {string} url - The URL to unblock.
 * @param {number} duration - The duration in minutes for which the URL should be unblocked.
 */
async function addToTempUnblocked(url, duration) {
  try {
    const expiryTime = Date.now() + duration * 60 * 1000;
    const tempUnblocks = await getFromStorage('tempUnblocks', new Map());
    tempUnblocks.set(url, expiryTime);
    await setInStorage('tempUnblocks', tempUnblocks);
    await browser.alarms.create(url, { when: expiryTime });
  } catch (error) {
    console.error("Error in addToTempUnblocked:", error);
  }
}

/**
 * Adds a temporary unblock reason to the list of reasons.
 *
 * @param {string} url - The URL to unblock.
 * @param {string} reason - The reason for unblocking.
 * @param {number} duration - The duration in minutes for which the URL should be unblocked.
 */
async function addToTempUnblockedReasons(url, reason, duration) {
  try {
    const tuple = [reason, duration];
    const tempUnblockReasons = await getFromStorage('tempUnblockReasons', new Map());
    const reasons = tempUnblockReasons.get(url) || [];
    reasons.push(tuple);
    tempUnblockReasons.set(url, reasons);
    await setInStorage('tempUnblockReasons', tempUnblockReasons);
  } catch (error) {
    console.error("Error in addToTempUnblockedReasons:", error);
  }
}

// Permanent Unblock Functions
// ---------------------------

/**
 * Handles the permanent unblock action.
 *
 * @param {object} message - The message object containing the action and reason.
 * @param {object} sender - The sender object containing the tab information.
 * @returns {Promise<object>} - A promise that resolves to the result of the unblock action.
 */
async function handlePermUnblock(message, sender) {
  try {
    const storedPassphrase = await getFromStorage("Passphrase");
    if (message.passphrase !== storedPassphrase) {
      return { status: "error", message: "Incorrect passphrase" };
    }

    const pattern = message.pattern;

    try {
      await removeFromBlockedSites(pattern);
    } catch (error) {
      console.error("Error in handlePermUnblock:", error);
      return { status: "error", message: "An error occurred while processing the unblock", error };
    }

    return { status: "success", message: "Site unblocked" };
  } catch (error) {
    console.error("Error in handlePermUnblock:", error);
    return { status: "error", message: "An error occurred while processing the unblock" };
  }
}

/**
 * Removes a URL from the list of blocked sites.
 *
 * @param {string} pattern - The URL pattern to remove.
 */
async function removeFromBlockedSites(pattern) {
  const blockedSites = await getFromStorage('blockedSites', new Map());
  if (blockedSites.has(pattern)) {
    const newBlockedSites = blockedSites.delete(pattern);
    await setInStorage('blockedSites', newBlockedSites);
  } else {
    console.error("Pattern not found in blocked sites:", pattern);
  }
}

// Alarm Handling
// --------------

/**
 * Handles the alarm event to remove expired temporary unblocks.
 *
 * @param {object} alarm - The alarm object.
 */
function handleAlarm(alarm) {
  const pattern = alarm.name;

  getFromStorage('tempUnblocks', new Map())
    .then(tempUnblocks => {
      if (tempUnblocks.has(pattern)) {  
        tempUnblocks.delete(pattern);
        return setInStorage('tempUnblocks', tempUnblocks);
      }
    })
    .catch(error => {
      console.error("Error in handleAlarm:", error);
    });
}

// Event Listeners
// ---------------

// Listener for tab updates to redirect if the URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    redirectIfBlocked(changeInfo.url);
  }
});

// Listener for messages sent from other parts of the extension
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tempUnblock") {
    handleTempUnblock(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" });
      });
    return true;
  } else if (message.action === "permUnblock") {
    handlePermUnblock(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" });
      });
    return true;
  }
});

// Listener for alarm events
browser.alarms.onAlarm.addListener(handleAlarm);