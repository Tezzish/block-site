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
  console.log("Temp Unblocks: ", tempUnblocks);
  if (tempUnblocks.has(pattern)) {
    const expiryTime = tempUnblocks.get(pattern);
    return expiryTime && expiryTime > Date.now();
  }
  return false;
}

async function removeTempUnblockFromStorage(url) {
  const tempUnblocks = await getFromStorage('tempUnblocks', new Map());
  if (tempUnblocks.delete(url)) {
    await setInStorage('tempUnblocks', tempUnblocks);
    await browser.alarms.clear(url);
  }
}

/**
 * Checks if the current tab is in the list of blocked sites.
 *
 * @param {string} url - The URL of the current tab.
 * @returns {Promise<boolean>} - A promise that resolves to the result of the check.
 */
async function isBlocked(url) {
  const isTempUnblocked = await isTemporarilyUnblocked(url);
  if (isTempUnblocked) {
    return false;
  }
  const blockedSites = await getFromStorage('blockedSites', new Map());
  const pattern = processUrl(url);
  return blockedSites.has(pattern) || blockedSites.has(url);
}

async function isRedirect() {
  try {
      const redirectUrl = await getFromStorage("redirectUrl");
      return new URL(redirectUrl);
  } catch (error) {
      return null;
  }
}

/**
 * Redirects the current tab to the blocked page if the site is blocked.
 *
 * @param {string} url - The URL of the current tab.
 */
async function redirectIfBlocked(tabId, url) {
  const redirectUrl = await isRedirect();
  isBlocked(url).then(isBlocked => {
  if (isBlocked) {
    if (redirectUrl) {
      browser.tabs.update(tabId, { url: redirectUrl.href });
      return true;
    }
    const encodedUrl = encodeURIComponent(url);
    const blockedPageUrl = `content/blocked.html?blockedUrl=${encodedUrl}`;
    browser.tabs.update(tabId, { url: blockedPageUrl });
    return true;
  }
  return false;
  });
  return false;
}

async function redirectBlockedToUnblocked(tabId, url) {
  if (!url.startsWith("moz-extension")) {
    return false;
  }
  const urlObj = new URL(url);
  const urlParams = new URLSearchParams(urlObj.search);
  const blockedUrl = urlParams.get('blockedUrl');
  if (!blockedUrl) {
    console.error("Blocked URL not found in query string");
    return false;
  }
  const decodedUrl = decodeURIComponent(blockedUrl);
  if (!await isBlocked(decodedUrl)) {
    browser.tabs.update(tabId, { url: decodedUrl });
    return true;
  }
  return false;
}

async function blockSite(url) {
  // const pattern = processUrl(url);
  const pattern = url;
  const urlObj = new URL(url);
  if (urlObj.protocol === 'moz-extension:' || urlObj.protocol === 'chrome-extension:') {
    return;
  }
  if (urlObj.hostname === '') {
    return;
  }
  const blockedSites = await getFromStorage('blockedSites', new Map());
  if (blockedSites.has(pattern)) {
    return;
  }
  blockedSites.set(pattern, Date.now());
  await setInStorage('blockedSites', blockedSites);
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

browser.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name.includes("://")) {
    await removeTempUnblockFromStorage(alarm.name);
  }
});

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

async function removeTempUnblock(message, sender) {
  try {
    const password = await getFromStorage("Passphrase");
    if (message.passphrase !== password) {
      return { status: "error", message: "Incorrect passphrase" };
    }
    const url = message.pattern;
    const tempUnblocks = await getFromStorage('tempUnblocks', new Map());
    if (tempUnblocks.delete(url)) {
      await setInStorage('tempUnblocks', tempUnblocks);
      await browser.alarms.clear(url);
      return { status: "success", message: "Temporary unblock removed" };
    }
    return { status: "error", message: "URL not found in temporary unblocks" };
  } catch (error) {
    console.error("Error in removeTempUnblock:", error);
    return { status: "error", message: "An error occurred while removing the temporary unblock" };
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
    if (!storedPassphrase) {
      return { status: "error", message: "Passphrase not set" };
    }
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
  if (blockedSites.delete(pattern)) {
    await setInStorage('blockedSites', blockedSites);
  } else {
    console.error("Pattern not found in blocked sites:", pattern);
  }
}

// Event Listeners
// ---------------

// Listener for tab updates to redirect if the URL changes
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the tab URL is defined and not the options page
  if (tab.url) {
    if (tab.url.startsWith("moz-extension") && tab.url.endsWith("options.html")) {
      return;
    }
  }
  if (changeInfo.url) {
    redirectIfBlocked(tabId, changeInfo.url)
      .then(isBlocked => {
        if (!isBlocked) {
          return redirectBlockedToUnblocked(tab, changeInfo.url);
        }
        return isBlocked;
      })
      .catch(error => {
        console.error("Error in tab update listener:", error);
      });
  }
});

// Listener for messages sent from other parts of the extension
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tempUnblock") {
    handleTempUnblock(message, sender)
      .then(() => {
        sendResponse({ status: "success", message: "Temporary unblock processed" });
      })
      .catch(error => {
        console.error("Error in handleTempUnblock:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred in handleTempUnblock" });
      });
    return true; // Indicates that the response will be sent asynchronously
  } else if (message.action === "permUnblock") {
    handlePermUnblock(message, sender)
      .then(() => {
        sendResponse({ status: "success", message: "Permanent unblock processed" });
      })
      .catch(error => {
        console.error("Error in handlePermUnblock:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred in handlePermUnblock" });
      });
    return true; // Indicates that the response will be sent asynchronously
  } else if (message.action === "removeTempUnblock") {
    removeTempUnblock(message, sender)
      .then(() => {
        sendResponse({ status: "success", message: "Temporary unblock removed" });
      })
      .catch(error => {
        console.error("Error in removeTempUnblock:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred in removeTempUnblock" });
      });
    return true; // Indicates that the response will be sent asynchronously
  } else if (message.action === "blockSite") {
    blockSite(message.pattern)
      .then(() => {
        sendResponse({ status: "success", message: "Site blocked" });
      })
      .catch(error => {
        console.error("Error in blockSite:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred in blockSite" });
      });
    return true; // Indicates that the response will be sent asynchronously
  } else {
    sendResponse({ status: "error", message: "Invalid action" });
  }
});

// Add blocking on the context menu
browser.contextMenus.create(
  {
    id: "block-site",
    title: "Block this site",
    contexts: ["all"],
  },
  () => {
    if (browser.runtime.lastError) {
      console.error("Error creating context menu item:", browser.runtime.lastError);
    }
  },
);

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case "block-site":
      await blockSite(tab.url);
      browser.tabs.reload(tab.id);
  }
});
