import { processUrl } from "../utils/utils.js";
//when dom loads

document.addEventListener('DOMContentLoaded', function() {
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    console.log("Popup DOM loaded");
    const activeTab = tabs[0];
    const pattern = processUrl(new URL(activeTab.url));
    const docPattern = document.getElementById('pattern');
    docPattern.textContent = pattern;

      /**
     * Adds a site to the list of blocked sites.
     * The list is stored in the extension's local storage.
     * 
     * @param {Event} event - The click event.
     */
    document.getElementById('addSite').addEventListener('click', () => {
    
        console.log("Adding site to blocked list: " + pattern);
        // we should not be able to block the extenion's own pages
        if (activeTab.url.includes('moz-extension://')) {
          return;
        }

        browser.storage.local.get({blockedSites: []}, function(result) {
          // Add the new pattern to the existing list of blocked sites
          // Only add the pattern if it doesn't already exist
          if (result.blockedSites.includes(pattern)) {
            return;
          }
          // add current time and pattern to blockedSites
          const updatedBlockedSites = [...result.blockedSites, [pattern, Date.now()]];
          // Save the updated list of blocked sites
          browser.storage.local.set({blockedSites: updatedBlockedSites});
          // reload the current page
          browser.tabs.reload(activeTab.id);
        });

    });
  });

    const optionsLink = document.getElementById('options-link');

    // Open the options page in a new tab when the link is clicked
    optionsLink.addEventListener('click', function(event) {
        event.preventDefault();
        browser.runtime.openOptionsPage();
  });
});

