import { hashString, getFromStorage, setInStorage } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const accordionContainer = document.querySelector('#unblock-rules-accordion');
    const passwordForm = document.getElementById('password-form');
    const passwordInput = document.getElementById('password');

    // Fetch unblock rules from storage
    async function fetchUnblockRules() {
        const blockedSites = await getFromStorage('blockedSites');
        if (!blockedSites) {
            return [];
        }
        return blockedSites;
    }

    async function fetchReasons() {
        const reasons = await getFromStorage('tempUnblockReasons');
        if (!reasons) {
            return {};
        }
        return reasons;
    }

    // Populate the accordion with unblock rules
    async function populateAccordion() {
        const rules = await fetchUnblockRules();
        const reasons = await fetchReasons();
        accordionContainer.innerHTML = ''; // Clear existing items

        if (rules.length === 0) {
            accordionContainer.innerHTML = '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button" type="button" disabled>No rules found</button></h2></div>';
            return;
        }

        rules.forEach(([pattern, date], index) => {
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
            if (!reasons[pattern] || reasons[pattern].length === 0) {
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
            (reasons[pattern] || []).forEach(reason => {
                const reasonItem = document.createElement('li');
                reasonItem.classList.add('list-group-item');
                reasonItem.textContent = reason[0] + ' (' + reason[1] + ' minutes)';
                reasonsList.appendChild(reasonItem);
            });
        
            accordionBody.appendChild(reasonsList);
            accordionCollapse.appendChild(accordionBody);
            accordionItem.appendChild(accordionCollapse);
            accordionContainer.appendChild(accordionItem);
        });
        
        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-rule-btn').forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                const buttonPattern = button.getAttribute('data-pattern');
                console.log('Removing rule:', buttonPattern);
                sendPermUnblockMessage(buttonPattern);
            });
        });
    }
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
                    alert(response.message);
                    populateAccordion();
                } else {
                    alert(response.message);
                }
            })
        }).catch(error => {
            console.error('Error in hashing password:', error);
        });
    }
    // Initial population of the accordion
    populateAccordion();
});