import { hashString, getFromStorage } from '../utils/utils.js';
document.addEventListener('DOMContentLoaded', () => {
  const unblockRequestForm = document.getElementById('unblockRequestForm');
  const unblockButton = document.getElementById('unblockButton');

  // Description: This script is injected into the blocked page to handle the unblock request form
  unblockRequestForm.addEventListener('submit', function(event) {
      event.preventDefault();
      // if there isn't a password in the storage, throw an error
      getFromStorage('Passphrase').then(password => {
          if (!password) {
              alert('Passphrase not set, please set a passphrase in the extension options page');
              throw new Error('Passphrase not set');
          }
      }).catch(error => {
          console.error('Error in getting password:', error);
          return;
      });
      // get the parameters from the form
      const reason = document.getElementById('reason').value;
      const duration = document.getElementById('duration').value;
      const passphrase = document.getElementById('passphrase').value;
      // Hash the passphrase
      hashString(passphrase).then(hashedPassphrase => {
          // Send a message to the background script to unblock the site
          browser.runtime.sendMessage({
            action: "tempUnblock", 
            reason: reason, 
            duration: duration, 
            passphrase: hashedPassphrase
          }).then(response => {
            if (response.status === 'success') {
              console.log(response.message);
              // reload the current tab
              const url = new URL(window.location.href);
              window.location.replace(url.searchParams.get('blockedUrl'));
            } else {
              alert(response.message);
              console.error(response.message);
            }
          }).catch(error => {
            switch (error.message) {
              case 'Incorrect passphrase':
                alert('Incorrect passphrase');
                break;
              case 'Blocked URL not found':
                alert('Blocked URL not found');
                break;
              default:
                alert('Error in sending message');
            }
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

  // listen to responses from the background script
  browser.runtime.onMessage.addListener((message, sender) => {
      if (message.action === 'showUnblockForm') {
          //set the visibility of the form to visible
          unblockRequestForm.style.visibility = 'visible';
          //set the visibility of the button to hidden
          unblockButton.style.display = 'none';
      }
  });
});