// Service Worker initialization
console.log('Service Worker initialized');

// Initialize state
let youtubeState = {
    isBlocked: true, // Default to blocked state
    intention: '',
    expiryTime: null,
    isInCooldown: false,
    cooldownEndTime: null
};

// Store the current timers
let expiryTimer = null;
let cooldownTimer = null;

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
    youtubeState.isInCooldown = true;
    
    // Clear timer reference
    expiryTimer = null;
    
    // Get cooldown time from storage
    chrome.storage.local.get(['youtubeCooldownTime'], (result) => {
        const cooldownTime = result.youtubeCooldownTime || 2; // Default to 2 minutes
        const cooldownEndTime = Date.now() + (cooldownTime * 60000);
        
        youtubeState.cooldownEndTime = cooldownEndTime;
        
        // Save cooldown end time to storage
        chrome.storage.local.set({
            youtubeCooldownEndTime: cooldownEndTime
        }, () => {
            console.log('Cooldown started, ends at:', new Date(cooldownEndTime));
            
            // Clear timer if exists
            if (cooldownTimer) {
                clearTimeout(cooldownTimer);
            }
            
            // Set new cooldown timer
            cooldownTimer = setTimeout(() => {
                endCooldown();
            }, cooldownTime * 60000);
            
            chrome.storage.local.remove(['youtubeIntention', 'youtubeExpiryTime'], () => {
                console.log('Intention expired and cleared');
                
                // Pause videos in all YouTube tabs, even inactive ones
                pauseVideosInAllTabs();
                
                // Notify content scripts about cooldown
                chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
                    if (tabs.length > 0) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, {
                                action: 'intentionExpired'
                            });
                        });
                    }
                });
            });
        });
    });
}

// Function to end cooldown
function endCooldown() {
    console.log('Cooldown ended');
    
    youtubeState.isInCooldown = false;
    youtubeState.cooldownEndTime = null;
    
    // Clear cooldown timer
    cooldownTimer = null;
    
    // Remove cooldown end time from storage
    chrome.storage.local.remove(['youtubeCooldownEndTime'], () => {
        console.log('Cooldown ended and cleared');
        
        // Notify content scripts
        chrome.tabs.query({url: "*://*.youtube.com/*"}, (tabs) => {
            if (tabs.length > 0) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'cooldownEnded'
                    });
                });
            }
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
        // Check if cooldown has ended but state not updated
        if (youtubeState.isInCooldown && youtubeState.cooldownEndTime && youtubeState.cooldownEndTime < Date.now()) {
            console.log('Cooldown ended but state not updated, ending now');
            endCooldown();
        }
        // Check if expiry time has passed but the timer hasn't fired yet
        else if (youtubeState.expiryTime && youtubeState.expiryTime < Date.now() && !youtubeState.isBlocked) {
            console.log('Expiry time passed but state not updated, expiring now');
            expireIntention();
        }
        
        sendResponse(youtubeState);
    }
    
    return true;
}); 