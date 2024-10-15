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
  if (tempUnblocks.has(pattern)) {
    const expiryTime = tempUnblocks.get(pattern);
    if (expiryTime && expiryTime < Date.now()) {
      await removeTempUnblockFromStorage(pattern);
      return false;
    }
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
  return blockedSites.has(pattern);
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
async function redirectIfBlocked(url) {
  const redirectUrl = await isRedirect();
  isBlocked(url).then(isBlocked => {
    if (isBlocked) {
      if (redirectUrl) {
        browser.tabs.update({ url: redirectUrl.href });
        return;
      }
      const encodedUrl = encodeURIComponent(url);
      const blockedPageUrl = `content/blocked.html?blockedUrl=${encodedUrl}`;
      browser.tabs.update({ url: blockedPageUrl });
      return true;
    }
  });
  return false;
}

async function redirectIfUnblocked(url) {
  // if it's not an extension page, return
  if (!url.startsWith("moz-extension")) {
    return false;
  }
  const urlObj = new URL(url);
  // get the encoded url from the query string
  const urlParams = new URLSearchParams(urlObj.search);
  const blockedUrl = urlParams.get('blockedUrl');
  if (!blockedUrl) {
    console.error("Blocked URL not found in query string");
    return;
  }
  const decodedUrl = decodeURIComponent(blockedUrl);
  // if not blocked, redirect to the original URL
  if (!await isBlocked(decodedUrl)) {
    browser.tabs.update({ url: decodedUrl });
  }
  return true;
}

async function blockSite(url) {
  const pattern = processUrl(url);
  const urlObj = new URL(url);
  if (urlObj.protocol === 'moz-extension:' || urlObj.protocol === 'chrome-extension:') {
    return;
  }
  if (urlObj.hostname === '') {
    return;
  }
  const blockedSites = await getFromStorage('blockedSites', new Map());
  console.log(blockedSites);
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
    const url = message.url;
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

// Alarm Handling
// --------------

/**
 * Handles the alarm event to remove expired temporary unblocks.
 *
 * @param {object} alarm - The alarm object.
 */
function handleAlarm(alarm) {
  const pattern = alarm.name;
  console.log("Alarm triggered for pattern:", pattern);

  getFromStorage('tempUnblocks', new Map())
    .then(tempUnblocks => {
      console.log("Retrieved tempUnblocks:", tempUnblocks);
      if (tempUnblocks.has(pattern)) {
        console.log("Pattern found in tempUnblocks:", pattern);
        tempUnblocks.delete(pattern);
        console.log("Pattern deleted from tempUnblocks:", pattern);
        console.log("Updated tempUnblocks:", tempUnblocks.keys());
        return setInStorage('tempUnblocks', tempUnblocks);
      } else {
        console.log("Pattern not found in tempUnblocks:", pattern);
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
  //if starts with moz-extension and ends with options.html, return
  if (tab.url) {
    if (tab.url.startsWith("moz-extension") && tab.url.endsWith("options.html")) {
      console.log("Options page opened");
      return;
    }
  }
  if (changeInfo.url) {
    redirectIfBlocked(changeInfo.url).then(isBlocked => {
      if (isBlocked) return true;
      return redirectIfUnblocked(changeInfo.url);
    }).then(isUnblocked => {
      if (isUnblocked) return true;
      return false;
    }).catch(error => {
      console.error("Error in tab update listener:", error);
      return false;
    });
  }
});

// Listener for messages sent from other parts of the extension
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "tempUnblock") {
    handleTempUnblock(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" + "handletemp" });
      });
    return true;
  } else if (message.action === "permUnblock") {
    handlePermUnblock(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" + "perm" });
      });
    return true;
  } else if (message.action === "removeTempUnblock") {
    removeTempUnblock(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" + "temp" });
      });
  } else if (message.action === "blockSite") {
    blockSite(message.pattern)
      .then(() => {
        sendResponse({ status: "success", message: "Site blocked" });
        console.log("Site blocked");
      })
      .catch(error => {
        console.error("Error in message listener:", error);
        sendResponse({ status: "error", message: "An unexpected error occurred" });
      });
    return true;
  }
  return true;
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


// Listener for alarm events
browser.alarms.onAlarm.addListener(handleAlarm);