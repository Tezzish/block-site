const blockedSites = browser.storage.local.get('blockedSites');
console.log(blockedSites)

// Function to check if a URL matches any blocked site patterns
function isBlocked(url, blockedSites) {
  const urlObj = new URL(url);
  return blockedSites.some(pattern => {
    // Simple pattern matching; you might need a more robust solution for wildcard patterns
    console.log(pattern, urlObj.hostname)
    const domain = pattern.replace('*://*.', '').replace('/*', '');
    return urlObj.hostname.includes(domain);
  });
}

browser.webRequest.onBeforeRequest.addListener(
  details => {
    return new Promise((resolve, reject) => {
      browser.storage.local.get({blockedSites: []}, function(result) {
        console.log(result.blockedSites);
        if (isBlocked(details.url, result.blockedSites)) {
          console.log(`Blocking request to ${details.url}`);
          // To cancel the request:
          // resolve({cancel: true});
          // Or to redirect to a different URL:
          resolve({redirectUrl: "https://example.com"});
        } else {
          resolve({}); // Do nothing if the URL is not blocked
        }
      });
    });
  },
  {urls: ["<all_urls>"]}, // Adjust the pattern as needed
  ["blocking"]
);