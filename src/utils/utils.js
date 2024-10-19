export async function hashString(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    // Convert the hash buffer to a hexadecimal string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Utility function to get data from local storage
export async function getFromStorage(key, defaultValue) {
    return browser.storage.local.get({ [key]: defaultValue }).then(result => result[key]);
}

// Utility function to set data in local storage
export async function setInStorage(key, value) {
    return browser.storage.local.set({ [key]: value });
}

export function processUrl(url) {
    const urlObj = new URL(url);
    return `*://*.${urlObj.hostname}/*`;
  }

export function checkUrlValidity(url) {
    if (!url.startsWith('http')) {
        return false;
    }
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}