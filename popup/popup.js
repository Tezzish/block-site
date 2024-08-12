/**
 * Adds a site to the list of blocked sites.
 * The list is stored in the extension's local storage.
 * 
 * @param {Event} event - The click event.
 */
document.getElementById('addSite').addEventListener('click', () => {
    browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // Get the URL of the active tab
      const activeTab = tabs[0];
      const url = new URL(activeTab.url);
      const pattern = `*://*.${url.hostname}/*`;
      console.log("Adding site to blocked list: " + pattern);
  
      browser.storage.local.get({blockedSites: []}, function(result) {
        // Add the new pattern to the existing list of blocked sites
        // Only add the pattern if it doesn't already exist
        if (result.blockedSites.includes(pattern)) {
          return;
        }
        const updatedBlockedSites = [...result.blockedSites, pattern];
        // Save the updated list of blocked sites
        browser.storage.local.set({blockedSites: updatedBlockedSites});
      });
      });
  });