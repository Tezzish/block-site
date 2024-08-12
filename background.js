// function to check if the tab is in the list of blocked sites in the extension's local storage

/**
 * Checks if the current tab is in the list of blocked sites.
 *
 * @param {string} url - The URL of the current tab.
 * @param {function} callback - Called with the result of the check.
 */
function isBlocked(url, callback) {
    browser.storage.local.get({blockedSites: []}, function(result) {
        const blockedSites = result.blockedSites;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        const isBlocked = blockedSites.some((pattern) => {
            // Extract the domain part from the pattern (e.g., `*.reddit.com` from `*://*.reddit.com/*`)
            const patternDomain = pattern.replace(/^\*:\/\/\*\./, '').replace(/\/\*$/, '');

            // Check if the hostname ends with the patternDomain
            return hostname === patternDomain || hostname.endsWith(`.${patternDomain}`);
        });

        callback(isBlocked);
    });
}
// function to redirect the site if it's blocked and to show the blocked page
/**
 * Redirects the current tab to the blocked page if the site is blocked.
 *
 * @param {string} url - The URL of the current tab.
 */
function redirectIfBlocked(url) {
    isBlocked(url, function(isBlocked) {
        if (isBlocked) {
            console.log("Redirecting to blocked page");
            browser.tabs.update({url: "/blocked.html"});
        }
    });
    }

// Add an event listener to the tabs.onUpdated event
// This event is fired when a tab is updated
// The listener checks if the tab is in the list of blocked sites
// If it is, the listener redirects the tab to the blocked page
browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        redirectIfBlocked(changeInfo.url);
    }
    });

const pattern = '*://*.example.com/*';
const url = 'https://www.example.com/whatever';

const regExp = new RegExp(pattern.replace(/\./g, '\\.').replace(/\*/g, '.*'));
console.log(regExp.test(url)); // Should print true