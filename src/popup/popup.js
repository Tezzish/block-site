import { getFromStorage, setInStorage, processUrl } from "../utils/utils.js";
//when dom loads

document.addEventListener('DOMContentLoaded', function() {
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
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
    document.getElementById('addSite').addEventListener('click', async () => {
      browser.runtime.sendMessage({
        action: "blockSite",
        pattern: activeTab.url
      }).then(response => {
        if (response.status === 'success') {
          browser.tabs.reload(activeTab.id);
        } else {
          alert(response.message);
        }
      })
    });
  });

    const optionsLink = document.getElementById('options-link');

    // Open the options page in a new tab when the link is clicked
    optionsLink.addEventListener('click', function(event) {
        event.preventDefault();
        browser.runtime.openOptionsPage();
  });
});

