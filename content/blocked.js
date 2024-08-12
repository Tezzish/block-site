const unblockRequestForm = document.getElementById('unblockRequestForm');
const unblockButton = document.getElementById('unblockButton');
// Description: This script is injected into the blocked page to handle the unblock request form
unblockRequestForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const reason = document.getElementById('reason').value;
    browser.runtime.sendMessage({action: "tempUnblock", reason: reason});
});

// Add an event listener to the unblock button to show the unblock request form
unblockButton.addEventListener('click', function() {
    console.log("Unhiding form");
    //set the visibility of the form to visible
    unblockRequestForm.style.visibility = 'visible';
    //set the visibility of the button to hidden
    unblockButton.style.display = 'none';
}
);
