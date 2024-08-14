import { hashString } from '../utils/utils.js';

const unblockRequestForm = document.getElementById('unblockRequestForm');
const unblockButton = document.getElementById('unblockButton');

// Description: This script is injected into the blocked page to handle the unblock request form
unblockRequestForm.addEventListener('submit', function(event) {
    event.preventDefault();
    // get the parameters from the form
    const reason = document.getElementById('reason').value;
    const time = document.getElementById('time').value;
    const passphrase = document.getElementById('passphrase').value;
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
