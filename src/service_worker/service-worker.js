// Service Worker initialization
console.log('Service Worker initialized');

// Initialize state
let youtubeState = {
    isBlocked: true, // Default to blocked state
    intention: '',
    expiryTime: null
};

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
    chrome.storage.local.get(['youtubeIntention', 'youtubeExpiryTime'], (result) => {
        if (result.youtubeIntention) {
            youtubeState.intention = result.youtubeIntention;
            youtubeState.isBlocked = false;
            
            if (result.youtubeExpiryTime) {
                youtubeState.expiryTime = result.youtubeExpiryTime;
                
                // If expiry time exists and is in the future, set up expiry
                const now = Date.now();
                if (result.youtubeExpiryTime > now) {
                    const timeToExpiry = result.youtubeExpiryTime - now;
                    setTimeout(() => {
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

// Function to expire an intention
function expireIntention() {
    youtubeState.isBlocked = true;
    youtubeState.intention = '';
    youtubeState.expiryTime = null;
    
    chrome.storage.local.remove(['youtubeIntention', 'youtubeExpiryTime'], () => {
        console.log('Intention expired and cleared');
        
        // Notify any open YouTube tabs
        chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'intentionExpired'
                });
            });
        });
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
            
            // Calculate time until expiry and set timeout
            const timeToExpiry = request.expiryTime - Date.now();
            setTimeout(() => {
                expireIntention();
            }, timeToExpiry);
        }
        
        sendResponse({success: true});
    } 
    else if (request.action === 'clearIntention') {
        youtubeState.isBlocked = true;
        youtubeState.intention = '';
        youtubeState.expiryTime = null;
        
        sendResponse({success: true});
    }
    else if (request.action === 'getState') {
        sendResponse(youtubeState);
    }
    
    return true;
}); 