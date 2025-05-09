// Service Worker initialization
console.log('Service Worker initialized');

// Initialize state
let youtubeState = {
    isBlocked: true, // Default to blocked state
    intention: '',
    expiryTime: null
};

// Store the current expiry timer
let expiryTimer = null;

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or updated');
    initializeState();
});

// Listen for browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started');
    initializeState();
});

// Function to initialize state from storage
function initializeState() {
    chrome.storage.local.get(['youtubeIntention', 'youtubeExpiryTime', 'youtubeTimeLimit'], (result) => {
        if (result.youtubeIntention) {
            youtubeState.intention = result.youtubeIntention;
            youtubeState.isBlocked = false;
            
            if (result.youtubeExpiryTime) {
                youtubeState.expiryTime = result.youtubeExpiryTime;
                
                // If expiry time exists and is in the future, set up expiry
                const now = Date.now();
                if (result.youtubeExpiryTime > now) {
                    const timeToExpiry = result.youtubeExpiryTime - now;
                    console.log(`Setting expiry timer for ${timeToExpiry/1000/60} minutes`);
                    
                    // Clear any existing timer
                    if (expiryTimer) {
                        clearTimeout(expiryTimer);
                    }
                    
                    // Set new timer
                    expiryTimer = setTimeout(() => {
                        expireIntention();
                    }, timeToExpiry);
                } else {
                    // If already expired, clear the intention
                    expireIntention();
                }
            }
        }
    });
}

// Function to pause videos in all YouTube tabs
function pauseVideosInAllTabs() {
    chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
        if (tabs.length > 0) {
            console.log(`Pausing videos in ${tabs.length} YouTube tabs`);
            tabs.forEach(tab => {
                // Execute script directly in the tab to pause video
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => {
                        const video = document.querySelector('video');
                        if (video && !video.paused) {
                            video.pause();
                            let tries = 0;
                            const interval = setInterval(() => {
                                if (!video.paused) {
                                video.pause();
                                }
                                tries++;
                                if (tries >= 4) clearInterval(interval);
                            }, 500);
                            console.log('Video paused due to time expiry');
                        }
                    }
                }).catch(err => console.error(`Failed to execute script in tab ${tab.id}:`, err));
                
                // Also send message to content script
                chrome.tabs.sendMessage(tab.id, {
                    action: 'intentionExpired'
                });
            });
        }
    });
}

// Function to expire an intention
function expireIntention() {
    console.log('Expiring intention. Time limit reached.');
    
    youtubeState.isBlocked = true;
    youtubeState.intention = '';
    youtubeState.expiryTime = null;
    
    // Clear timer reference
    expiryTimer = null;
    
    chrome.storage.local.remove(['youtubeIntention', 'youtubeExpiryTime'], () => {
        console.log('Intention expired and cleared');
        
        // Pause videos in all YouTube tabs, even inactive ones
        pauseVideosInAllTabs();
    });
}

// Add message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.action === 'setIntention') {
        youtubeState.intention = request.intention;
        youtubeState.isBlocked = false;
        
        // If an expiry time is provided, set up the timer
        if (request.expiryTime) {
            youtubeState.expiryTime = request.expiryTime;
            
            // Clear any existing timer
            if (expiryTimer) {
                clearTimeout(expiryTimer);
                expiryTimer = null;
            }
            
            // Calculate time until expiry and set timeout
            const timeToExpiry = Math.ceil((request.expiryTime - Date.now()) / 60000) * 60000;
            
            if (timeToExpiry > 0) {
                console.log(`Setting new expiry timer for ${timeToExpiry/60000} minutes`);
                expiryTimer = setTimeout(() => {
                    expireIntention();
                }, timeToExpiry);
            } else {
                console.log('Expiry time is in the past, expiring immediately');
                expireIntention();
            }
        }
        
        sendResponse({success: true});
    } 
    else if (request.action === 'clearIntention') {
        youtubeState.isBlocked = true;
        youtubeState.intention = '';
        youtubeState.expiryTime = null;
        
        // Clear any existing timer
        if (expiryTimer) {
            clearTimeout(expiryTimer);
            expiryTimer = null;
        }
        
        sendResponse({success: true});
    }
    else if (request.action === 'getState') {
        // Check if expiry time has passed but the timer hasn't fired yet
        if (youtubeState.expiryTime && youtubeState.expiryTime < Date.now() && !youtubeState.isBlocked) {
            console.log('Expiry time passed but state not updated, expiring now');
            expireIntention();
        }
        
        sendResponse(youtubeState);
    }
    
    return true;
}); 