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
    // Inject Tailwind CSS
    const tailwindLink = document.createElement('link');
    tailwindLink.rel = 'stylesheet';
    tailwindLink.type = 'text/css';
    tailwindLink.href = chrome.runtime.getURL('popup/popup.css');
    document.head.appendChild(tailwindLink);
    
    // Inject content specific CSS
    const contentLink = document.createElement('link');
    contentLink.rel = 'stylesheet';
    contentLink.type = 'text/css';
    contentLink.href = chrome.runtime.getURL('content/content.css');
    document.head.appendChild(contentLink);
    
    // Add Google Fonts
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);
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

// Function to pause YouTube video if playing
function pauseVideo() {
    const video = document.querySelector('video');
    if (video && !video.paused) {
        video.pause();
        console.log('Video paused due to time expiry');
    }
}

// Function to show blocking overlay
function showBlockingOverlay() {
    // Pause video if playing
    pauseVideo();
    
    // Remove existing overlay if it exists
    if (blockingOverlay) {
        blockingOverlay.remove();
    }
    
    // Create blocking overlay
    blockingOverlay = document.createElement('div');
    blockingOverlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[10000] p-8 transition-opacity duration-300 ease-in-out';
    
    blockingOverlay.innerHTML = `
        <div class="bg-white rounded-2xl p-10 max-w-[550px] w-full shadow-lg flex flex-col text-center font-sans">
            <h2 class="text-3xl font-semibold text-gray-900 mb-4">Set Your YouTube Intention</h2>
            <p class="text-xl text-gray-600 mb-8">To access YouTube, please set an intention for your viewing session.</p>
            <div class="flex gap-4 mt-auto">
                <input type="text" class="flex-grow py-4 px-6 border-2 border-gray-200 rounded-full text-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                    placeholder="What would you like to do on YouTube today?" />
                <button class="bg-blue-500 hover:bg-blue-600 text-white py-4 px-8 rounded-full font-semibold text-xl transition-colors whitespace-nowrap">
                    Continue
                </button>
            </div>
        </div>
    `;
    
    // Add overlay to page
    document.body.appendChild(blockingOverlay);

    // Prevent scrolling of the body
    document.body.classList.add('overflow-hidden', 'h-full', 'w-full', 'fixed');
    
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
        input.classList.add('border-red-500', 'animate-shake');
        
        // Reset styles after animation
        setTimeout(() => {
            input.classList.remove('border-red-500', 'animate-shake');
        }, 1500);
        return;
    }
    
    // Get the time limit from storage
    chrome.storage.local.get(['youtubeTimeLimit'], function(result) {
        const timeLimit = result.youtubeTimeLimit || 30; // Default to 30 minutes
        const expiryTime = Date.now() + (timeLimit * 60 * 1000);
        
        // Save intention to storage with expiry time
        chrome.storage.local.set({
            youtubeIntention: intention,
            youtubeExpiryTime: expiryTime
        }, function() {
            console.log('Intention saved:', intention, 'Expires at:', new Date(expiryTime));
            
            // Notify service worker
            chrome.runtime.sendMessage({
                action: 'setIntention',
                intention: intention,
                expiryTime: expiryTime
            }, function(response) {
                if (response && response.success) {
                    // Remove overlay and allow scrolling
                    removeBlockingOverlay();
                    
                    // Update state
                    isYouTubeBlocked = false;
                }
            });
        });
    });
}

// Remove the CSS class when allowed
function removeBlockingOverlay() {
    if (blockingOverlay) {
        blockingOverlay.remove();
        blockingOverlay = null;
    }
    
    // Allow scrolling by removing the CSS classes
    document.body.classList.remove('overflow-hidden', 'h-full', 'w-full', 'fixed');
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
        
        // Pause video before showing overlay
        pauseVideo();
        
        // Set to blocked and show overlay
        isYouTubeBlocked = true;
        showBlockingOverlay();
        
        sendResponse({success: true});
    } else if (request.action === 'clearIntention') {
        console.log('Intention cleared');
        
        // Pause video before showing overlay
        pauseVideo();
        
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