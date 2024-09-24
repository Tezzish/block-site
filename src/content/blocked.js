import { hashString, getFromStorage } from '../utils/utils.js';
document.addEventListener('DOMContentLoaded', () => {
  const unblockRequestForm = document.getElementById('unblock-request-form');
  const unblockButton = document.getElementById('unblock-button');

  const clouds = document.querySelectorAll('.cloud');
  clouds.forEach(cloud => {
      // make sure that the cloud is from 0 to 40% from the top
      cloud.style.top = `${Math.random() * 30}%`;
      cloud.style.animationDelay = `${Math.random() * 40}s`; // Random animation delay between 0s and 10s, and 0s for fadeIn
    });

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
      if (!passphrase && !reason) {
          alert('Please enter your passphrase and reason!');
          return;
      } else if (!passphrase) {
          alert('Please enter your passphrase!');
          return;
      } else if (!reason) {
          alert('Please enter a reason!');
          return;
      }
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

  // Add an event listener to the unblock button to toggle the unblock request form
  unblockButton.addEventListener('click', function() {
    if (unblockRequestForm.style.visibility === 'visible') {
        unblockRequestForm.style.visibility = 'hidden';
        unblockButton.innerText = 'Like to unblock?';
    } else {
        unblockRequestForm.style.visibility = 'visible';
        // unblockButton.innerText = 'Submit request';
        unblockButton.style.visibility = 'hidden';
    }
  });
});