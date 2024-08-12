# Website Blocker Extension

## Overview
The Website Blocker is a browser extension designed to block specified websites. Users can add websites to a block list, and when they attempt to visit these sites, they will be redirected to a blocked page. Users can also request temporary unblocking of a site by providing a reason and a password.

## Features
- Block websites by adding them to a block list.
- Redirect blocked websites to a custom blocked page.
- Request temporary unblocking of a site with a reason and password.
- Configurable unblock duration.

## Installation
1. Clone the repository to your local machine.
2. Open your browser and navigate to the extensions page (e.g., `chrome://extensions/` for Chrome).
3. Enable "Developer mode" if it is not already enabled.
4. Click on "Load unpacked" and select the directory where you cloned the repository.

## Usage
### Blocking a Website
1. Click on the extension icon in the browser toolbar.
2. Click the "Block This Site" button to add the current site to the block list.

### Unblocking a Website
1. When you visit a blocked site, you will be redirected to a blocked page.
2. Click the "Like to unblock?" button.
3. Fill out the form with a reason and password, and select the duration for which you want to unblock the site.
4. Submit the form to request temporary unblocking.

## Files
- `popup/popup.js`: Handles adding sites to the block list.
- `blocked.js`: Handles the unblock request form on the blocked page.
- `popup/popup.html`: HTML for the popup that allows users to block sites.
- `blocked.html`: HTML for the blocked page with the unblock request form.
- `manifest.json`: Configuration file for the browser extension.

## Permissions
The extension requires the following permissions:
- `storage`: To store the list of blocked sites.
- `activeTab`: To get the URL of the active tab.
- `webRequest`, `webRequestBlocking`: To intercept and block requests to specified sites.
- `<all_urls>`: To allow blocking of any URL.

## License
This project is licensed under the MIT License.