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
            accordionHeader.classList.add('card-header');
            accordionHeader.id = `heading-${index}`;

            const accordionButton = document.createElement('button');
            accordionButton.classList.add('btn', 'btn-link', 'collapsed');
            accordionButton.type = 'button';
            accordionButton.setAttribute('data-toggle', 'collapse');
            accordionButton.setAttribute('data-target', `#collapse-${index}`);
            accordionButton.setAttribute('aria-expanded', 'false');
            accordionButton.setAttribute('aria-controls', `collapse-${index}`);
            accordionButton.innerHTML = `
                ${rule}
                <button class="btn btn-danger btn-sm ml-auto remove-rule-btn">
                    <i class="bi bi-trash"></i>
                </button>
            `;

            accordionHeader.appendChild(accordionButton);
            accordionItem.appendChild(accordionHeader);

            const accordionCollapse = document.createElement('div');
            accordionCollapse.id = `collapse-${index}`;
            accordionCollapse.classList.add('collapse');
            accordionCollapse.setAttribute('aria-labelledby', `heading-${index}`);
            accordionCollapse.setAttribute('data-parent', '#unblock-rules-accordion');

            const accordionBody = document.createElement('div');
            accordionBody.classList.add('card-body');

            // Add the <p> element before the list of reasons
            const reasonsParagraph = document.createElement('p');
            reasonsParagraph.textContent = 'Reasons:';
            accordionBody.appendChild(reasonsParagraph);

            const reasonsList = document.createElement('ul');
            reasonsList.classList.add('list-group', 'reasons-list');
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
                confirmAndRemoveUnblockRule(rule);
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

    async function confirmAndRemoveUnblockRule(rule) {
        const storedPassphrase = await getFromStorage('Passphrase');
        const inputPassphrase = prompt('Enter your passphrase to remove the rule');

        hashString(inputPassphrase).then(hashedPassphrase => {
            if (hashedPassphrase === storedPassphrase) {
                removeFromBlockedSites(rule);
            } else {
                alert('Incorrect passphrase');
            }
        }).catch(error => {
            console.error('Error in hashing password:', error);
        });
    }

    async function removeFromBlockedSites(pattern) {
        const blockedSites = await getFromStorage('blockedSites', []);
        const newBlockedSites = blockedSites.filter(site => site !== pattern);
        await setInStorage('blockedSites', newBlockedSites);
        populateAccordion();
    }

    // Initial population of the accordion
    populateAccordion();
});