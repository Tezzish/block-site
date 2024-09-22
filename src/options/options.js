import { hashString, getFromStorage, setInStorage } from '../utils/utils.js';


const passwordForm = document.getElementById('password-form');
const passwordInput = document.getElementById('password');

passwordForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting normally
    const password = passwordInput.value;
    if (password) {
        hashString(password).then(hashedPassphrase => {
            setInStorage('Passphrase', hashedPassphrase);
        }).catch(error => {
            console.error('Error in hashing password:', error);
        });
        alert('Password saved successfully!');
        //clear the input field
        passwordInput.value = '';
    } else {
        alert('Please enter a password.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    const tableBody = document.querySelector('#unblock-rules-table tbody');
  
    // Fetch unblock rules from storage
    async function fetchUnblockRules() {
      const blockedSites = await getFromStorage('blockedSites');
      if (!blockedSites) {
        console.log("Mistake");
        return [];
      }
      return blockedSites;
    }
  
    // Populate the table with unblock rules
    async function populateTable() {
      const rules = await fetchUnblockRules();
      console.log(rules);
      tableBody.innerHTML = ''; // Clear existing rows
        rules.forEach(rule => {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.textContent = rule;
            row.appendChild(cell);

            const removeButton = document.createElement('button');
            removeButton.innerHTML = '<i class="bi bi-trash"></i>';
            removeButton.addEventListener('click', () => confirmAndRemoveUnblockRule(rule));
            const buttonCell = document.createElement('td');
            buttonCell.appendChild(removeButton);
            row.appendChild(buttonCell);

            tableBody.appendChild(row);
        });
    }

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
        });}

    async function removeFromBlockedSites(pattern) {
        const blockedSites = await getFromStorage('blockedSites', []);
        const newBlockedSites = blockedSites.filter(site => site !== pattern);
        await setInStorage('blockedSites', newBlockedSites);
        populateTable();
    }

    // Initial population of the table
    populateTable();
});