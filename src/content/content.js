// Content script initialization
console.log('Content script loaded');

// Global variables
let blockingOverlay = null;
let isYouTubeBlocked = true;

// Function to initialize the content script
function initialize() {
    console.log('Content script initialized');
    
    // Inject CSS
    injectStyles();
    
    // Check YouTube state from service worker
    checkYouTubeState();
}

// Function to inject CSS
function injectStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content/content.css');
    document.head.appendChild(link);
}

// Function to check YouTube state from service worker
function checkYouTubeState() {
    chrome.runtime.sendMessage({action: 'getState'}, (response) => {
        if (response) {
            isYouTubeBlocked = response.isBlocked;
            
            if (isYouTubeBlocked) {
                // YouTube is blocked, show blocking overlay
                showBlockingOverlay();
            }
        } else {
            // Default to blocked if no response
            isYouTubeBlocked = true;
            showBlockingOverlay();
        }
    });
}

// Function to show blocking overlay
function showBlockingOverlay() {
    // Remove existing overlay if it exists
    if (blockingOverlay) {
        blockingOverlay.remove();
    }
    
    // Create blocking overlay
    blockingOverlay = document.createElement('div');
    blockingOverlay.className = 'yt-blocking-overlay';
    
    blockingOverlay.innerHTML = `
        <div class="yt-overlay-container">
            <h2 class="yt-overlay-title">Set Your YouTube Intention</h2>
            <p class="yt-overlay-description">To access YouTube, please set an intention for your viewing session.</p>
            <div class="yt-overlay-input-container">
                <input type="text" class="yt-overlay-input" placeholder="What would you like to do on YouTube today?" />
                <button class="yt-overlay-button">Submit</button>
            </div>
        </div>
    `;
    
    // Add overlay to page
    document.body.appendChild(blockingOverlay);

    // Prevent scrolling of the body using CSS class
    document.body.classList.add('yt-no-scroll');
    
    // Focus on input
    setTimeout(() => {
        const input = blockingOverlay.querySelector('input');
        if (input) {
            input.focus();
        }
    }, 100);
    
    // Add event listener to button
    const button = blockingOverlay.querySelector('button');
    const input = blockingOverlay.querySelector('input');
    
    if (button && input) {
        // Submit on enter key
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                submitIntention(input.value);
            }
        });
        
        // Submit on button click
        button.addEventListener('click', function() {
            submitIntention(input.value);
        });
    }
}

// Function to submit intention
function submitIntention(intention) {
    intention = intention.trim();
    
    if (intention.length < 3) {
        const input = blockingOverlay.querySelector('input');
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.3)';
        
        // Add shake animation
        input.style.animation = 'shake 0.5s';
        
        // Reset styles after animation
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
            input.style.animation = '';
        }, 1500);
        return;
    }
    
    // Save intention to storage
    chrome.storage.local.set({youtubeIntention: intention}, function() {
        console.log('Intention saved:', intention);
        
        // Notify service worker
        chrome.runtime.sendMessage({
            action: 'setIntention',
            intention: intention
        }, function(response) {
            if (response && response.success) {
                // Remove overlay and allow scrolling
                removeBlockingOverlay();
                
                // Update state
                isYouTubeBlocked = false;
            }
        });
    });
}

// Remove the CSS class when allowed
function removeBlockingOverlay() {
    if (blockingOverlay) {
        blockingOverlay.remove();
        blockingOverlay = null;
    }
    
    // Allow scrolling by removing the CSS class
    document.body.classList.remove('yt-no-scroll');
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'setIntention') {
        console.log('Received intention:', request.intention);
        
        // Update state
        isYouTubeBlocked = false;
        
        // Remove overlay if it exists
        if (blockingOverlay) {
            removeBlockingOverlay();
        }
        
        sendResponse({success: true});
    } else if (request.action === 'intentionExpired') {
        console.log('Intention expired');
        
        // Set to blocked and show overlay
        isYouTubeBlocked = true;
        showBlockingOverlay();
        
        sendResponse({success: true});
    } else if (request.action === 'clearIntention') {
        console.log('Intention cleared');
        
        // Set to blocked and show overlay
        isYouTubeBlocked = true;
        showBlockingOverlay();
        
        sendResponse({success: true});
    }
    return true;
});

// Run initialization when the page is fully loaded
if (document.readyState === 'complete') {
    initialize();
} else {
    window.addEventListener('load', initialize);
} 