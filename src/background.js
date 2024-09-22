import { getFromStorage, setInStorage, processUrl } from './utils/utils.js';

// Add a function to check if a URL is temporarily unblocked
async function isTemporarilyUnblocked(url) {
  const pattern = processUrl(url);
  const tempUnblocks = await getFromStorage('tempUnblocks', {});
  const expiryTime = tempUnblocks[pattern];
  return expiryTime && expiryTime > Date.now();
}

// Function to check if the tab is in the list of blocked sites in the extension's local storage
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
  const blockedSites = await getFromStorage('blockedSites', []);
  const hostname = new URL(url).hostname;

  return blockedSites.some(pattern => {
    const patternDomain = pattern.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');
    return hostname === patternDomain || hostname.endsWith(`.${patternDomain}`);
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
async function handleTempUnblock(message, sender) {
  try {
    const storedPassphrase = await getFromStorage("Passphrase");
    if (message.passphrase !== storedPassphrase) {
      return { status: "error", message: "Incorrect passphrase" };
    }

    const duration = parseInt(message.time, 10);
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

// function for adding a URL to the list of temporarily unblocked sites
async function addToTempUnblocked(url, duration) {
  try {
    const expiryTime = Date.now() + duration * 60 * 1000;
    const tempUnblocks = await getFromStorage('tempUnblocks', {});
    tempUnblocks[url] = expiryTime;
    await setInStorage('tempUnblocks', tempUnblocks);
    await browser.alarms.create(url, { when: expiryTime });
  } catch (error) {
    console.error("Error in addToTempUnblocked:", error);
  }
}

// function for adding a temp unblocked reason to the list of reasons
async function addToTempUnblockedReasons(url, reason, duration) {
  try {
    const tuple = [reason, duration];
    const tempUnblockReasons = await getFromStorage('tempUnblockReasons', {});
    const reasons = tempUnblockReasons[url] || [];
    reasons.push(tuple);
    tempUnblockReasons[url] = reasons;
    await setInStorage('tempUnblockReasons', tempUnblockReasons);
  } catch (error) {
    console.error("Error in addToTempUnblockedReasons:", error);
  }
}

async function handlePermUnblock(message, sender) {
  try {
    const storedPassphrase = await getFromStorage("Passphrase");
    if (message.passphrase !== storedPassphrase) {
      return { status: "error", message: "Incorrect passphrase" };
    }

    const urlParams = new URLSearchParams(new URL(sender.tab.url).search);
    const blockedUrl = urlParams.get('blockedUrl');

    if (!blockedUrl) {
      return { status: "error", message: "Blocked URL not found" };
    }

    const pattern = processUrl(blockedUrl);
    await removeFromBlockedSites(pattern);

    return { status: "success", message: "Site unblocked" };
  } catch (error) {
    console.error("Error in handlePermUnblock:", error);
    return { status: "error", message: "An error occurred while processing the unblock" };
  }
}

async function removeFromBlockedSites(pattern) {
  // get the list of blocked sites
  const blockedSites = await getFromStorage('blockedSites', []);
  // remove the pattern from the list
  const newBlockedSites = blockedSites.filter(site => site !== pattern);
  // save the updated list back to storage
  await setInStorage('blockedSites', newBlockedSites);
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