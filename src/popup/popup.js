document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup
    console.log('Popup loaded');
    
    const textarea = document.querySelector('textarea');
    const continueButton = document.querySelector('button');
    
    // Load previously saved intention if it exists
    chrome.storage.local.get(['youtubeIntention'], function(result) {
        if (result.youtubeIntention) {
            textarea.value = result.youtubeIntention;
        }
    });
    
    // Save intention when button is clicked
    continueButton.addEventListener('click', function() {
        const intention = textarea.value.trim();
        
        if (intention) {
            // Save the intention
            chrome.storage.local.set({youtubeIntention: intention}, function() {
                console.log('Intention saved');
                
                // Send message to content script
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'setIntention',
                        intention: intention
                    });
                });
                
                // Close the popup
                window.close();
            });
        } else {
            // Handle empty intention
            textarea.classList.add('border-red-500');
            setTimeout(() => {
                textarea.classList.remove('border-red-500');
            }, 1500);
        }
    });
}); 