document.addEventListener('DOMContentLoaded', function() {
    // Initialize popup
    console.log('Popup loaded');
    
    const contentDiv = document.getElementById('content');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsIcon = document.getElementById('settings-icon');
    
    // Default time limit and cooldown time in minutes
    let timeLimit = 30;
    let cooldownTime = 2;
    
    // Load saved settings if available
    chrome.storage.local.get(['youtubeTimeLimit', 'youtubeCooldownTime'], function(result) {
        if (result.youtubeTimeLimit) {
            timeLimit = result.youtubeTimeLimit;
        }
        if (result.youtubeCooldownTime) {
            cooldownTime = result.youtubeCooldownTime;
        }
    });
    
    console.log('Adding click event to settings icon');
    
    // Make sure settings panel is initially hidden
    settingsPanel.style.display = 'none';
    contentDiv.style.display = 'block';
    
    // Add click event to settings button
    settingsIcon.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default button behavior
        console.log('Settings icon clicked');
        
        // Check if settings panel is currently hidden using direct style check
        if (settingsPanel.style.display === 'none') {
            // Show settings panel
            contentDiv.style.display = 'none';
            settingsPanel.style.display = 'block';
            displaySettings();
            console.log('Toggled: Settings panel shown, content hidden');
        } else {
            // Hide settings panel
            settingsPanel.style.display = 'none';
            contentDiv.style.display = 'block';
            console.log('Toggled: Settings panel hidden, content shown');
        }
    });
    
    // Function to format the expiry time
    function formatExpiryTime(expiryTime) {
        if (!expiryTime) return '';
        
        const now = new Date();
        const expiry = new Date(expiryTime);
        
        // If expiry is in the past, return expired message
        if (expiry <= now) {
            return 'Session expired';
        }
        
        // Calculate time remaining
        const diffMs = expiry - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        // Format the time
        if (diffHours > 0) {
            return `Expires in ${diffHours}h ${remainingMins}m`;
        } else if (diffMins == 0 && diffMs > 0) {
            return `Expires in less than 1 minute`;
        }
        else {
            return `Expires in ${remainingMins}m`;
        }
    }
    
    // Function to display settings
    function displaySettings() {
        settingsPanel.innerHTML = `
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
                    <h2 class="text-lg font-semibold text-gray-800 mb-3">Settings</h2>
                    <div class="mb-4">
                        <label for="timeLimit" class="block text-sm font-medium text-gray-700 mb-1">
                            Session Length
                        </label>
                        <input 
                            type="number" 
                            id="timeLimit" 
                            class="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-colors" 
                            min="1" 
                            max="240" 
                            value="${timeLimit}"
                        >
                        <p class="text-sm text-gray-500 mt-1">
                            Length of the session.
                        </p>
                    </div>
                    <div class="mb-4">
                        <label for="cooldownTime" class="block text-sm font-medium text-gray-700 mb-1">
                            Cooldown Period
                        </label>
                        <input 
                            type="number" 
                            id="cooldownTime" 
                            class="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-colors" 
                            min="1" 
                            max="120" 
                            value="${cooldownTime}"
                        >
                        <p class="text-sm text-gray-500 mt-1">
                            Time to wait before next session can start.
                        </p>
                    </div>
                </div>
                <div class="flex space-x-3 mt-4">
                    <button id="saveSettings" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-full font-medium transition-colors">
                        Save
                    </button>
                    <button id="cancelSettings" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-4 rounded-full font-medium transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for settings buttons
        document.getElementById('saveSettings').addEventListener('click', function() {
            // Get time limit value
            const timeLimitInput = document.getElementById('timeLimit');
            const cooldownTimeInput = document.getElementById('cooldownTime');
            
            const newTimeLimit = parseInt(timeLimitInput.value);
            const newCooldownTime = parseInt(cooldownTimeInput.value);
            
            // Validate inputs
            let isValid = true;
            
            if (isNaN(newTimeLimit) || newTimeLimit < 1) {
                timeLimitInput.classList.add('border-red-500');
                isValid = false;
            }
            
            if (isNaN(newCooldownTime) || newCooldownTime < 1) {
                cooldownTimeInput.classList.add('border-red-500');
                isValid = false;
            }
            
            if (!isValid) return;
            
            // Save settings
            timeLimit = newTimeLimit;
            cooldownTime = newCooldownTime;
            
            chrome.storage.local.set({
                youtubeTimeLimit: timeLimit,
                youtubeCooldownTime: cooldownTime
            }, function() {
                console.log('Settings saved. Time limit:', timeLimit, 'Cooldown time:', cooldownTime);
                
                // Return to main panel
                settingsPanel.style.display = 'none';
                contentDiv.style.display = 'block';
            });
        });
        
        document.getElementById('cancelSettings').addEventListener('click', function() {
            // Return to main panel without saving
            settingsPanel.style.display = 'none';
            contentDiv.style.display = 'block';
        });
    }
    
    // Check YouTube state from service worker
    chrome.runtime.sendMessage({action: 'getState'}, function(state) {
        if (state && !state.isBlocked && state.intention) {
            // If YouTube is already unblocked, show the current intention
            displayCurrentIntention(state.intention, state.expiryTime);
        } else {
            // Show the intention input form
            displayIntentionForm();
        }
    });
    
    // Function to display the current intention
    function displayCurrentIntention(intention, expiryTime) {
        const expiryText = formatExpiryTime(expiryTime);
        
        contentDiv.innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
                    <h2 class="text-lg font-semibold text-blue-800 mb-2">Current Intention</h2>
                    <p class="text-md text-blue-700">${intention}</p>
                    ${expiryText ? `<p class="text-sm text-blue-600 mt-2 font-medium">${expiryText}</p>` : ''}
                </div>
                <div class="flex space-x-3 mt-4">
                    <button id="editIntention" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2.5 px-4 rounded-full font-medium transition-colors">
                        Edit
                    </button>
                    <button id="clearIntention" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-4 rounded-full font-medium transition-colors">
                        Clear
                    </button>
                </div>
            </div>
        `;

        // Update the expiry time display every minute
        if (expiryTime) {
            const updateInterval = setInterval(() => {
                const expiryElement = contentDiv.querySelector('.text-blue-600');
                if (expiryElement) {
                    const updatedText = formatExpiryTime(expiryTime);
                    expiryElement.textContent = updatedText;
                    
                    // If expired, refresh the entire view
                    if (updatedText === 'Session expired') {
                        clearInterval(updateInterval);
                        chrome.runtime.sendMessage({action: 'getState'}, function(state) {
                            if (state && state.isBlocked) {
                                displayIntentionForm();
                            }
                        });
                    }
                } else {
                    // If element no longer exists, clear the interval
                    clearInterval(updateInterval);
                }
            }, 60000); // Update every minute
        }
        
        // Add event listeners
        document.getElementById('editIntention').addEventListener('click', function() {
            displayIntentionForm(intention);
        });
        
        document.getElementById('clearIntention').addEventListener('click', function() {
            // Clear intention from storage
            chrome.storage.local.remove(['youtubeIntention', 'youtubeExpiryTime'], function() {
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
                <div class="p-4 rounded-xl bg-gray-50">
                    <p class="text-gray-700 font-medium text-lg mb-3">What would you like to do on YouTube today?</p>
                    <textarea id="intentionInput" class="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 transition-colors text-md resize-none" rows="2" placeholder="Enter your intention...">${currentIntention}</textarea>
                </div>
                <button id="saveIntention" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-full font-medium text-md transition-colors mt-2">
                    Continue to YouTube
                </button>
            </div>
        `;
        
        // Get the textarea and button elements
        const textarea = document.getElementById('intentionInput');
        const saveButton = document.getElementById('saveIntention');
        
        // Function to handle intention submission
        const submitIntention = function() {
            const intention = textarea.value.trim();
            
            if (intention) {
                // Calculate expiry time (current time + time limit in minutes)
                const expiryTime = Date.now() + (timeLimit * 60 * 1000);
                
                // Save the intention and expiry time
                chrome.storage.local.set({
                    youtubeIntention: intention,
                    youtubeExpiryTime: expiryTime
                }, function() {
                    console.log('Intention saved with expiry time:', expiryTime);
                    
                    // Send message to service worker with expiry time
                    chrome.runtime.sendMessage({
                        action: 'setIntention',
                        intention: intention,
                        expiryTime: expiryTime
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
                            displayCurrentIntention(intention, expiryTime);
                        });
                    });
                });
            } else {
                // Handle empty intention
                textarea.classList.add('border-red-500');
                textarea.classList.add('animate-shake');
                setTimeout(() => {
                    textarea.classList.remove('border-red-500');
                    textarea.classList.remove('animate-shake');
                }, 1500);
            }
        };
        
        // Add event listener for Enter key on textarea
        textarea.addEventListener('keydown', function(e) {
            // Check if Enter was pressed without Shift (to allow line breaks with Shift+Enter)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent adding a new line
                submitIntention();
            }
        });
        
        // Add event listener to save button
        saveButton.addEventListener('click', submitIntention);
    }
}); 