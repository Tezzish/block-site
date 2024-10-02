import { hashString, getFromStorage } from '../utils/utils.js';
document.addEventListener('DOMContentLoaded', () => {
  const unblockRequestForm = document.getElementById('unblock-request-form');
  const unblockButton = document.getElementById('unblock-button');
  const optionsLink = document.getElementById('options-link');
  const clouds = document.querySelectorAll('.cloud');
  var i = 0;
  clouds.forEach(cloud => {
      cloud.style.top = `${Math.random() * 20}%`;
      cloud.style.animationDelay = `${i * 10}s`;
      i++;
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

  optionsLink.addEventListener('click', function(event) {
    event.preventDefault();
    browser.runtime.openOptionsPage();
  });
});

// Function to add twinkling stars to the top 20% of the page
function populateStars() {
  // create the html elements
  const stars = document.createElement('div');
  stars.classList.add('stars');
  stars.style.position = 'absolute';
  stars.style.width = '100%';
  stars.style.height = '20vh'; // Set height to 20% of the viewport height
  stars.style.top = '0';
  stars.style.left = '0';
  stars.style.pointerEvents = 'none'; // Ensure it doesn't interfere with other elements

  const star = document.createElement('div');
  star.classList.add('star');
  star.style.position = 'absolute';

  star.style.backgroundColor = 'white'; // Set color of each star
  star.style.borderRadius = '50%'; // Make each star circular

  // add the stars to the page
  for (let i = 0; i < 100; i++) {
      const newStar = star.cloneNode();
      newStar.style.left = `${Math.random() * 100}%`;
      newStar.style.top = `${Math.random() * 100}%`; // Use 100% since the parent is already 20vh
      newStar.style.width = `${Math.random() * 2 + 1}px`;
      newStar.style.height = newStar.style.width;
      newStar.style.animationDuration = `${Math.random() * 2 + 1}s`;
      // add the twinkling animation to the stars
      if (Math.random() > 0.7) {
          newStar.style.animationName = 'twinkle';
          // ease-in-out for a smooth transition
          newStar.style.animationTimingFunction = 'ease-in-out';
          // repeat the animation infinitely
          newStar.style.animationIterationCount = 'infinite';
          // randomize how fast the stars twinkle
          newStar.style.animationDuration = `${Math.random() * 3 + 1}s`;
      }
      stars.appendChild(newStar);
  }
  document.body.appendChild(stars);
  // move the stars to the background
  stars.style.zIndex = '-2';
}

populateStars();