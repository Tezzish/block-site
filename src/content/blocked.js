import { hashString, getFromStorage, processUrl } from '../utils/utils.js';
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
  // create a timer to show the time since the page was blocked
  const timerCon = document.getElementById('timer-container')

  const timerHeader = document.createElement('h2');
  timerHeader.textContent = "You've blocked this site for:";

  const timer = document.getElementById('timer');

  const motivationExpressions = [
      "You're doing great!",
      "Keep it up!",
      "You can do it!",
      "Stay strong!",
      "You got this!",
  ];
  const motivation = document.createElement('h3');
  motivation.textContent = motivationExpressions[Math.floor(Math.random() * motivationExpressions.length)];
  timerCon.appendChild(timerHeader);
  timerCon.appendChild(timer);
  timerCon.appendChild(motivation);

  // get the time the page was blocked
  getFromStorage('blockedSites').then(blockedSites => {
      const url = new URL(window.location.href);
      const blockedUrl = url.searchParams.get('blockedUrl');
      const processed = processUrl(new URL(blockedUrl));
      const blockedTime = blockedSites.get(processed);
      if (blockedTime) {
          // show the timer
          timer.style.visibility = 'visible';
          // update the timer every second
          setInterval(() => {
              const currentTime = Date.now();
              const timeDiff = currentTime - blockedTime;
              const hours = Math.floor(timeDiff / 3600000);
              const minutes = Math.floor((timeDiff % 3600000) / 60000);
              const seconds = Math.floor((timeDiff % 60000) / 1000);
              timer.textContent = `${hours}h ${minutes}m ${seconds}s`;
          }, 1000);
      }
  }
  ).catch(error => {
      console.error('Error in getting blocked sites:', error);
  });

  // Description: This script is injected into the blocked page to handle the unblock request form
  unblockRequestForm.addEventListener('submit', function(event) {
      event.preventDefault();
      // if there isn't a password in the storage, throw an error
      getFromStorage('passphrase').then(password => {
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

  let modalClosed = false;

  unblockButton.addEventListener('click', function() {
      if (unblockRequestForm.style.visibility === 'visible') {
          unblockRequestForm.style.visibility = 'hidden';
          unblockButton.innerText = 'Like to unblock?';
      } else {
          const unblockModal = document.getElementById('unblock-modal');
          unblockModal.style.display = 'block';
          const progressBar = document.getElementById('countdown-progress-bar');
          let width = 30;
          const totalSteps = 10 * 20;
          const decrement = 100 / totalSteps;
          let id = setInterval(frame, 50);

          function frame() {
              if (width <= 0) {
                  clearInterval(id);
              } else {
                  width -= decrement;
                  progressBar.style.width = width + '%';
              }
          }
          // Reset the flag when the modal is shown
          modalClosed = false;
  
          // Add event listener for the modal close button
          document.getElementById("close-modal").addEventListener('click', function(event) {
              console.log('close modal');
              modalClosed = true;
              unblockModal.style.display = 'none';
              width = 30;
          });
  
          setTimeout(() => {
              if (!modalClosed && width <= 0) {
                  unblockRequestForm.style.visibility = 'visible';
                  unblockButton.style.visibility = 'hidden';
                  unblockModal.style.display = 'none';
                  timerCon.style.display = 'none';
                  timer.style.visibility = 'hidden';
              }
          }, 4000);
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