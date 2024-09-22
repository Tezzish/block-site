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
      console.log(blockedSites);
      if (!blockedSites) {
        return [];
      }
      return blockedSites.blockedSites;
    }
  
    // Populate the table with unblock rules
    async function populateTable() {
      const rules = await fetchUnblockRules();
      tableBody.innerHTML = ''; // Clear existing rows
        rules.forEach(rule => {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.textContent = rule;
            row.appendChild(cell);

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => confirmAndRemoveUnblockRule(rule));
            const buttonCell = document.createElement('td');
            buttonCell.appendChild(removeButton);
            row.appendChild(buttonCell);

            tableBody.appendChild(row);
        });
    }

    // Initial population of the table
    populateTable();
});