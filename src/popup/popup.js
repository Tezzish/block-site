import { processUrl, checkUrlValidity } from "../utils/utils.js";

document.addEventListener('DOMContentLoaded', function() {
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    const title = document.createElement('h1');
    title.id = "title";
    const blockContainer = document.getElementById('block-container');
    if (!activeTab || activeTab.url === undefined) return;
    title.classList.add("text-white");
    if (!checkUrlValidity(activeTab.url)) {
      title.textContent = "Cannot block this page";
      blockContainer.insertBefore(title, blockContainer.lastElementChild);
      return;
    }
    title.textContent = "Add Site to Block List";

    const patternElem = document.createElement('h4');
    patternElem.id = "pattern";
    patternElem.textContent = "Pattern: ";
    patternElem.className = "text-white";

    const pattern = processUrl(new URL(activeTab.url));
    patternElem.textContent += pattern;

    const blockSiteButton = document.createElement('button');
    blockSiteButton.id = "addSite";
    blockSiteButton.className = "btn btn-danger";
    blockSiteButton.textContent = "Block site";

    blockSiteButton.addEventListener('click', async () => {
      browser.runtime.sendMessage({
        action: "blockSite",
        pattern: processUrl(activeTab.url)
      }).then(response => {
        if (response.status === 'success') {
          browser.tabs.reload(activeTab.id);
        } else {
          alert(response.message);
        }
      })
    });

    const blockPageButton = document.createElement('button');
    blockPageButton.id = "addPage";
    blockPageButton.className = "btn btn-danger";
    blockPageButton.textContent = "Block page";

    blockPageButton.addEventListener('click', async () => {
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

    blockContainer.insertBefore(title, blockContainer.lastElementChild);
    blockContainer.insertBefore(patternElem, blockContainer.lastElementChild);
    blockContainer.insertBefore(blockSiteButton, blockContainer.lastElementChild);
    blockContainer.insertBefore(blockPageButton, blockContainer.lastElementChild);
  });

    const optionsLink = document.getElementById('options-link');

    // Open the options page in a new tab when the link is clicked
    optionsLink.addEventListener('click', function(event) {
        event.preventDefault();
        browser.runtime.openOptionsPage();
  });
});
