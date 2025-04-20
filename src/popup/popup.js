document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup
    console.log('Popup loaded');
    
    const contentDiv = document.getElementById('content');
    
    // Check YouTube state from service worker
    chrome.runtime.sendMessage({action: 'getState'}, function(state) {
        if (state && !state.isBlocked && state.intention) {
            // If YouTube is already unblocked, show the current intention
            displayCurrentIntention(state.intention);
        } else {
            // Show the intention input form
            displayIntentionForm();
        }
    });
    
    // Function to display the current intention
    function displayCurrentIntention(intention) {
        contentDiv.innerHTML = `
            <div class="space-y-4">
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h2 class="text-md font-medium text-green-800 mb-2">Current Intention</h2>
                    <p class="text-sm text-green-700">${intention}</p>
                </div>
                <div class="flex space-x-2">
                    <button id="editIntention" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors">
                        Edit
                    </button>
                    <button id="clearIntention" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors">
                        Clear
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('editIntention').addEventListener('click', function() {
            displayIntentionForm(intention);
        });
        
        document.getElementById('clearIntention').addEventListener('click', function() {
            // Clear intention from storage
            chrome.storage.local.remove(['youtubeIntention'], function() {
                console.log('Intention cleared');
                
                // Notify service worker
                chrome.runtime.sendMessage({action: 'clearIntention'}, function() {
                    // Update UI
                    displayIntentionForm();
                    
                    // Notify content script if YouTube is open
                    chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
                        if (tabs.length > 0) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'clearIntention'
                            });
                        }
                    });
                });
            });
        });
    }
    
    // Function to display the intention input form
    function displayIntentionForm(currentIntention = '') {
        contentDiv.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-100 p-3 rounded-lg">
                    <p class="text-sm text-gray-700">What do you want to watch?</p>
                    <textarea id="intentionInput" class="w-full mt-2 p-2 border border-gray-300 rounded text-sm" rows="2" placeholder="Enter your intention...">${currentIntention}</textarea>
                </div>
                <button id="saveIntention" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors">
                    Continue to YouTube
                </button>
            </div>
        `;
        
        // Add event listener to save button
        document.getElementById('saveIntention').addEventListener('click', function() {
            const intention = document.getElementById('intentionInput').value.trim();
            
            if (intention) {
                // Save the intention
                chrome.storage.local.set({youtubeIntention: intention}, function() {
                    console.log('Intention saved');
                    
                    // Send message to service worker
                    chrome.runtime.sendMessage({
                        action: 'setIntention',
                        intention: intention
                    }, function() {
                        // Send message to content script if YouTube is open
                        chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
                            if (tabs.length > 0) {
                                chrome.tabs.sendMessage(tabs[0].id, {
                                    action: 'setIntention',
                                    intention: intention
                                });
                            }
                            
                            // Update UI
                            displayCurrentIntention(intention);
                        });
                    });
                });
            } else {
                // Handle empty intention
                const textarea = document.getElementById('intentionInput');
                textarea.classList.add('border-red-500');
                setTimeout(() => {
                    textarea.classList.remove('border-red-500');
                }, 1500);
            }
        });
    }
}); 