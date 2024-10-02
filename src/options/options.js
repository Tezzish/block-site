import { hashString, getFromStorage, setInStorage } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const accordionContainer = document.querySelector('#unblock-rules-accordion');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password');

    // Function to add twinkling stars to the top 20% of the page
function populateStars() {
    // create the html elements
    const stars = document.createElement('div');
    stars.classList.add('stars');
    stars.style.position = 'fixed';
    stars.style.width = '100%';
    stars.style.height = '100vh';
    stars.style.top = '0';
    stars.style.left = '0';
    stars.style.pointerEvents = 'none';
  
    const star = document.createElement('div');
    star.classList.add('star');
    star.style.position = 'absolute';
  
    star.style.backgroundColor = 'white';
    star.style.borderRadius = '50%';
  
    // add the stars to the page
    for (let i = 0; i < 550; i++) {
        const newStar = star.cloneNode();
        newStar.style.left = `${Math.random() * 100}%`;
        newStar.style.top = `${Math.random() * 100}%`;
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
    // // move the stars to the background
    stars.style.zIndex = '-1';
  }
  
  populateStars();

    // Populate the accordion with unblock rules
    async function populateAccordion() {
        const blockedSites = await getFromStorage('blockedSites', new Map());
        const rules = Array.from(blockedSites.keys());
        const reasons = await getFromStorage('tempUnblockReasons', new Map());
        accordionContainer.innerHTML = ''; // Clear existing items

        if (rules.length === 0) {
            accordionContainer.innerHTML = '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button" type="button" disabled>No rules found</button></h2></div>';
            return;
        }

        rules.forEach((pattern, index) => {
              // create a new accordion item
            const accordionItem = document.createElement('div');
            accordionItem.classList.add('accordion-item');

            // Create the header
            const accordionHeader = document.createElement('h2');
            accordionHeader.classList.add('accordion-header');

            // Create the button wrapper
            const accordionButtonWrapper = document.createElement('div');
            accordionButtonWrapper.classList.add('d-flex', 'justify-content-between', 'align-items-center');
            accordionButtonWrapper.id = `heading${index}`;

            // Create the button
            const accordionButton = document.createElement('button');
            accordionButton.classList.add('accordion-button', 'collapsed', 'chevron-right', 'flex-grow-1', 'text-start');
            accordionButton.setAttribute('type', 'button');
            accordionButton.setAttribute('data-bs-toggle', 'collapse');
            accordionButton.setAttribute('data-bs-target', `#collapse${index}`);
            accordionButton.setAttribute('aria-expanded', 'false');
            accordionButton.setAttribute('aria-controls', `collapse${index}`);
            accordionButton.textContent = pattern;

            // Create the remove button
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-danger', 'remove-rule-btn', 'ms-3');
            removeButton.innerHTML = '<i class="bi bi-trash"></i>';
            removeButton.setAttribute('data-pattern', pattern);

            removeButton.addEventListener('click', function(event) {
                event.preventDefault();
                const buttonPattern = removeButton.getAttribute('data-pattern');
                console.log('Removing rule:', buttonPattern);
                sendPermUnblockMessage(buttonPattern);
            });

            // Append the remove button and text to the button wrapper
            accordionButtonWrapper.appendChild(accordionButton);
            accordionButtonWrapper.appendChild(removeButton);

            // Append the button wrapper to the header
            accordionHeader.appendChild(accordionButtonWrapper);

            // Append the header to the accordion item
            accordionItem.appendChild(accordionHeader);

            // Create the collapse div
            const accordionCollapse = document.createElement('div');
            accordionCollapse.classList.add('accordion-collapse', 'collapse');
            accordionCollapse.setAttribute('id', `collapse${index}`);

            // Create the body
            const accordionBody = document.createElement('div');
            accordionBody.classList.add('accordion-body');
            accordionCollapse.appendChild(accordionBody);

            // Append the collapse div to the accordion item
            accordionItem.appendChild(accordionCollapse);

            // Append the accordion item to the container
            accordionContainer.appendChild(accordionItem);

            const reasonsParagraph = document.createElement('p');
            if (!reasons.get(pattern) || reasons.get(pattern).length === 0) {
                reasonsParagraph.textContent = 'No reasons for temporary unblocks provided.';
                accordionBody.appendChild(reasonsParagraph);
                accordionCollapse.appendChild(accordionBody);
                accordionItem.appendChild(accordionCollapse);
                accordionContainer.appendChild(accordionItem);
                return;
            }
            reasonsParagraph.textContent = 'Reasons for temporary unblocks:';
            accordionBody.appendChild(reasonsParagraph);
        
            const reasonsList = document.createElement('ul');
            reasonsList.classList.add('list-group', 'reasons-list');
            
            // Add each reason as a list item
            (reasons.get(pattern)).forEach(reason => {
                const reasonItem = document.createElement('li');
                reasonItem.classList.add('list-group-item');
                reasonItem.textContent = reason[0] + ' (' + reason[1] + (reason[1] > 1 ? ' minutes)' : ' minute)');
                reasonsList.appendChild(reasonItem);
            });
        
            accordionBody.appendChild(reasonsList);
            accordionCollapse.appendChild(accordionBody);
            accordionItem.appendChild(accordionCollapse);
            accordionContainer.appendChild(accordionItem);
        });
    }

    async function populateTempUnblocks() {
        const urls = await getFromStorage('tempUnblocks', new Map());
        const unblockList = Array.from(urls.keys());
        const tempUnblockList = document.getElementById('temp-unblock-list');
        tempUnblockList.innerHTML = '';
        // add the urls to the list
        unblockList.forEach(url => {
            const listItem = document.createElement('li');
            listItem.classList.add('temp-list-item');
            listItem.classList.add('list-group-item');
            const heading = document.createElement('h2');
            heading.classList.add("temp-unblock-heading");
            heading.textContent = url;
            listItem.appendChild(heading);
            tempUnblockList.appendChild(listItem);
            // add the remove temp unblock button
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-danger', 'remove-temp-unblock-btn');
            removeButton.innerHTML = '<i class="bi bi-trash"></i>';
            removeButton.setAttribute('data-url', url);
            removeButton.addEventListener('click', async function(event) {
                event.preventDefault();
                const url = removeButton.getAttribute('data-url');
                try {
                    await sendRemoveTempUnblockMessage(url);
                    populateTempUnblocks();
                } catch (error) {
                    console.error("Error removing temporary unblock:", error);
                }
            });
            listItem.appendChild(removeButton);
        });
        return;
    }

    populateTempUnblocks();

    // Add event listener to the password form
    passwordForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const password = passwordInput.value;
        if (password) {
            hashString(password).then(hashedPassphrase => {
                setInStorage('Passphrase', hashedPassphrase);
            }).catch(error => {
                console.error('Error in hashing password:', error);
            });
            alert('Password saved successfully!');
            passwordInput.value = '';
        } else {
            alert('Please enter a password.');
        }
    });

    function checkUrlValidity(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    const redirectForm = document.getElementById('redirect-url-form');
    redirectForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const redirectUrl = document.getElementById('redirect-url').value
        if (redirectUrl) {
            if (checkUrlValidity(redirectUrl)){
                setInStorage('redirectUrl', redirectUrl);
                alert('Redirect URL saved successfully!');
                document.getElementById('redirect-url').value = '';
            } else {
                alert(redirectUrl + ' is not a valid URL.');
            }
        } else {
            alert('Please enter a URL.');
        }
    });

    const removeRedirectUrl = document.getElementById('remove-redirect-url');
    removeRedirectUrl.addEventListener('click', async function(event) {
        event.preventDefault();
        await browser.storage.local.remove('redirectUrl');
        alert('Redirect URL removed successfully!');
    });

    async function sendRemoveTempUnblockMessage(url) {
        const inputPassphrase = prompt('Enter your passphrase to remove the rule');
        if (!inputPassphrase) {
            return;
        }
        hashString(inputPassphrase).then(hashedPassphrase => {
            browser.runtime.sendMessage({
                action: 'removeTempUnblock',
                passphrase: hashedPassphrase,
                url: url
            }).then(response => {
                if (response.status === 'success') {
                    populateTempUnblocks();
                } else {
                    alert(response.message);
                }
            })
        }).catch(error => {
            console.error('Error in hashing password:', error);
        });
    }

    async function sendPermUnblockMessage(pattern) {
        const inputPassphrase = prompt('Enter your passphrase to remove the rule');
        if (!inputPassphrase) {
            return;
        }
        hashString(inputPassphrase).then(hashedPassphrase => {
            browser.runtime.sendMessage({
                action: 'permUnblock',
                passphrase: hashedPassphrase,
                pattern: pattern
            }).then(response => {
                if (response.status === 'success') {
                    populateAccordion();
                } else {
                    alert(response.message);
                }
            })
        }).catch(error => {
            console.error('Error in hashing password:', error);
        });
    }

    async function serialiseBlockedSites() {
        try {
            const blockedSites = await getFromStorage('blockedSites', new Map());
            if (blockedSites.size === 0) {
                alert('No rules found');
                return;
            }
            const json = JSON.stringify(Array.from(blockedSites.entries()));
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
    
            browser.downloads.download({
                url: url,
                filename: 'blocked.sites',
                saveAs: true
            }).then(() => {
                URL.revokeObjectURL(url);
            }).catch((error) => {
                console.error(`Download failed: ${error}`);
            });
        } catch (error) {
          console.error("Error in serialiseBlockedSites:", error);
          alert('An error occurred while exporting blocked sites');
        }
    }
    
    async function deserialiseBlockedSites() {
        const selectedFile = document.getElementById("file-input").files[0];
        if (!selectedFile) {
            alert('Please select a file');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (!Array.isArray(data)) {
                    throw new Error("Invalid data format");
                }
                const blockedSites = new Map(data);
                await setInStorage('blockedSites', blockedSites);
                alert('Blocked sites imported successfully');
                // reload the accordion
                populateAccordion();
            } catch (error) {
                console.error("Error in deserialiseBlockedSites:", error);
                alert('An error occurred while importing blocked sites');
            }
        };
        reader.readAsText(selectedFile);
    }

    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const fileInput = document.getElementById('file-input');
    exportButton.addEventListener('click', serialiseBlockedSites);
    importButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', deserialiseBlockedSites);
    populateAccordion();
});