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
    
        rules.forEach((rule, index) => {
            const accordionItem = document.createElement('div');
            accordionItem.classList.add('card');
        
            const accordionHeader = document.createElement('div');
            accordionHeader.classList.add('card-header', 'd-flex', 'align-items-center'); // Make the header a flex container
        
            // Create the toggle button with a triangle icon
            const toggleButton = document.createElement('button');
            toggleButton.classList.add('btn', 'btn-link', 'p-0', 'mr-2');
            toggleButton.setAttribute('data-toggle', 'collapse');
            toggleButton.setAttribute('data-target', `#collapse-${index}`);
            toggleButton.setAttribute('aria-expanded', 'false');
            toggleButton.setAttribute('aria-controls', `collapse-${index}`);
            toggleButton.innerHTML = '<i class="bi bi-chevron-right"></i>'; // Sideways triangle icon
                    
            // Add event listener to toggle the icon
            toggleButton.addEventListener('click', function() {
                const icon = this.querySelector('i');
                icon.classList.toggle('bi-chevron-right');
                icon.classList.toggle('bi-chevron-down'); // Downwards triangle icon
            });

            accordionHeader.appendChild(toggleButton);
        
            const accordionButton = document.createElement('button');
            accordionButton.classList.add('btn', 'btn-link', 'collapsed', 'flex-grow-1', 'text-left'); // Make the button take up available space and align text to the left
            accordionButton.type = 'button';
            accordionButton.setAttribute('data-toggle', 'collapse');
            accordionButton.setAttribute('data-target', `#collapse-${index}`);
            accordionButton.setAttribute('aria-expanded', 'false');
            accordionButton.setAttribute('aria-controls', `collapse-${index}`);
            accordionButton.innerHTML = `${rule}`;

            // Add event listener to toggle the icon
            accordionButton.addEventListener('click', function() {
                const icon = toggleButton.querySelector('i');
                icon.classList.toggle('bi-chevron-right');
                icon.classList.toggle('bi-chevron-down'); // Downwards triangle icon
            });
        
            accordionHeader.appendChild(accordionButton);
        
            // Create the remove button
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-danger', 'btn-sm', 'ml-auto', 'remove-rule-btn');
            removeButton.innerHTML = '<i class="bi bi-trash"></i>';
            removeButton.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent the accordion from toggling when clicking the remove button
                sendPermUnblockMessage(rule);
            });
        
            accordionHeader.appendChild(removeButton);
            accordionItem.appendChild(accordionHeader);
        
            // Create the collapse element
            const accordionCollapse = document.createElement('div');
            accordionCollapse.id = `collapse-${index}`;
            accordionCollapse.classList.add('collapse');
            accordionCollapse.setAttribute('aria-labelledby', `heading-${index}`);
            accordionCollapse.setAttribute('data-parent', '#unblock-rules-accordion');
        
            const accordionBody = document.createElement('div');
            accordionBody.classList.add('card-body');
        
            // Add the <p> element before the list of reasons
            const reasonsParagraph = document.createElement('p');
            if (!reasons[rule] || reasons[rule].length === 0) {
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
            (reasons[rule] || []).forEach(reason => {
                const reasonItem = document.createElement('li');
                reasonItem.classList.add('list-group-item');
                reasonItem.textContent = '\t' + reason[0] + ' (' + reason[1] + ' minutes)';
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
                const rule = event.target.closest('.btn-link').textContent.trim();
                sendPermUnblock(rule);
            });
        });
    }
    
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
        const storedPassphrase = await getFromStorage('Passphrase');
        const inputPassphrase = prompt('Enter your passphrase to remove the rule');

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