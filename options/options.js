// Utility function to get data from local storage
function getFromStorage(key, defaultValue) {
    return browser.storage.local.get({ [key]: defaultValue }).then(result => result[key]);
}

// Function to display blocked sites
function displayBlockedSites() {
    const blockedSitesList = document.getElementById('blockedSitesList');
    blockedSitesList.innerHTML = ''; // Clear existing list

    getFromStorage('blockedSites', [])
        .then(blockedSites => {
            if (blockedSites.length === 0) {
                blockedSitesList.innerHTML = '<li>No sites are currently blocked.</li>';
            } else {
                blockedSites.forEach(site => {
                    const li = document.createElement('li');
                    li.textContent = site;
                    blockedSitesList.appendChild(li);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching blocked sites:', error);
            blockedSitesList.innerHTML = '<li>Error fetching blocked sites.</li>';
        });
}

// Function to display temporary unblocks
function displayTempUnblocks() {
    const tempUnblocksList = document.getElementById('tempUnblocksList');
    tempUnblocksList.innerHTML = ''; // Clear existing list

    getFromStorage('tempUnblocks', {})
        .then(tempUnblocks => {
            if (Object.keys(tempUnblocks).length === 0) {
                tempUnblocksList.innerHTML = '<li>No sites are currently temporarily unblocked.</li>';
            } else {
                for (const [site, expiryTime] of Object.entries(tempUnblocks)) {
                    const li = document.createElement('li');
                    const expiryDate = new Date(expiryTime);
                    li.textContent = `${site} (Unblocked until ${expiryDate.toLocaleString()})`;
                    tempUnblocksList.appendChild(li);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching temporary unblocks:', error);
            tempUnblocksList.innerHTML = '<li>Error fetching temporary unblocks.</li>';
        });
}

// Function to display unblock history
function displayUnblockHistory() {
    const unblockHistoryList = document.getElementById('unblockHistoryList');
    unblockHistoryList.innerHTML = ''; // Clear existing list

    getFromStorage('tempUnblockReasons', {})
        .then(tempUnblockReasons => {
            if (Object.keys(tempUnblockReasons).length === 0) {
                unblockHistoryList.innerHTML = '<li>No unblock history available.</li>';
            } else {
                for (const [site, reasons] of Object.entries(tempUnblockReasons)) {
                    const li = document.createElement('li');
                    li.textContent = site;
                    const ul = document.createElement('ul');
                    reasons.forEach(([reason, duration]) => {
                        const reasonLi = document.createElement('li');
                        reasonLi.textContent = `Reason: ${reason}, Duration: ${duration} minutes`;
                        ul.appendChild(reasonLi);
                    });
                    li.appendChild(ul);
                    unblockHistoryList.appendChild(li);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching unblock history:', error);
            unblockHistoryList.innerHTML = '<li>Error fetching unblock history.</li>';
        });
}

// Call these functions when the options page loads
document.addEventListener('DOMContentLoaded', () => {
    displayBlockedSites();
    displayTempUnblocks();
    displayUnblockHistory();
});