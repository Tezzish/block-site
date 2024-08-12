// Description: This script is injected into the blocked page to handle the unblock request form
document.getElementById('unblockRequestForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const reason = document.getElementById('reason').value;
    browser.runtime.sendMessage({action: "tempUnblock", reason: reason});
});

// Add an event listener to the unblock button to show the unblock request form
document.getElementById('unblockButton').addEventListener('click', function() {
    //set the visibility of the form to visible
    document.getElementById('unblockRequestForm').style.visibility = 'visible';
    //set the visibility of the button to hidden
    document.getElementById('unblockButton').style.display = 'none';
}
);
