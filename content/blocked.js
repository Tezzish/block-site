const unblockRequestForm = document.getElementById('unblockRequestForm');
const unblockButton = document.getElementById('unblockButton');

// Description: This script is injected into the blocked page to handle the unblock request form
unblockRequestForm.addEventListener('submit', function(event) {
    event.preventDefault();
    // get the parameters from the form
    const reason = document.getElementById('reason').value;
    const time = document.getElementById('time').value;
    const passphrase = document.getElementById('passphrase').value;
    // function to hash the password
    async function hashString(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);

        // Convert the hash buffer to a hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }
    // Hash the passphrase
    hashString(passphrase).then(hashedPassphrase => {
        // Send a message to the background script to unblock the site
        browser.runtime.sendMessage({
          action: "tempUnblock", 
          reason: reason, 
          time: time, 
          passphrase: hashedPassphrase
        }).then(response => {
          if (response.status === 'success') {
            console.log(response.message);
          } else {
            console.error(response.message);
          }
        }).catch(error => {
          console.error("Error in sending message:", error);
        });
      });
});

// Add an event listener to the unblock button to show the unblock request form
unblockButton.addEventListener('click', function() {
    //set the visibility of the form to visible
    unblockRequestForm.style.visibility = 'visible';
    //set the visibility of the button to hidden
    unblockButton.style.display = 'none';
}
);
