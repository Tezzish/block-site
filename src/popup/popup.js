import { processUrl, checkUrlValidity } from "../utils/utils.js";

document.addEventListener('DOMContentLoaded', function() {
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    const title = document.createElement('h1');
    const blockContainer = document.getElementById('block-container');
    if (!activeTab || activeTab.url === undefined) return;
    title.classList.add("text-white");
    if (activeTab.url.startsWith("about:") || activeTab.url.startsWith("moz-extension:")) {
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

    const blockButton = document.createElement('button');
    blockButton.id = "addSite";
    blockButton.className = "btn btn-danger";
    blockButton.textContent = "Block";

    blockButton.addEventListener('click', async () => {
      console.log("Adding site to blocked list" + pattern);
      if (!checkUrlValidity(activeTab.url)) {
        alert('Invalid URL');
        return;
      }
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
    console.log(blockContainer.lastElementChild);
    blockContainer.insertBefore(title, blockContainer.lastElementChild);
    blockContainer.insertBefore(patternElem, blockContainer.lastElementChild);
    blockContainer.insertBefore(blockButton, blockContainer.lastElementChild);
  });

    const optionsLink = document.getElementById('options-link');

    // Open the options page in a new tab when the link is clicked
    optionsLink.addEventListener('click', function(event) {
        event.preventDefault();
        browser.runtime.openOptionsPage();
  });
});

