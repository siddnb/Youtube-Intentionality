// Content script initialization
console.log('Content script loaded');

// Global variables
let blockingOverlay = null;
let isYouTubeBlocked = true;
let isInCooldown = false;
let cooldownTimer = null;

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
            isInCooldown = response.isInCooldown;
            console.log(response);
            
            if (isYouTubeBlocked) {
                // YouTube is blocked, show blocking overlay
                console.log('Youtube is blocked');
                pauseVideo();
                showBlockingOverlay();
            }
        } else {
            // Default to blocked if no response
            console.log('Defaulting to blocked');
            isYouTubeBlocked = true;
            pauseVideo();
            showBlockingOverlay();
        }
    });
}

// Function to pause YouTube video if playing
function pauseVideo() {
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
        console.log('Video paused');
    }
}

// Function to show blocking overlay
function showBlockingOverlay() {
    
    // Remove existing overlay if it exists
    if (blockingOverlay) {
        blockingOverlay.remove();
    }
    
    // Check if in cooldown mode
    if (isInCooldown) {
        showCooldownOverlay();
        return;
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
    console.log('Blocking overlay added');

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

// Function to show cooldown overlay
function showCooldownOverlay() {
    // Create cooldown overlay
    blockingOverlay = document.createElement('div');
    blockingOverlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[10000] p-8 transition-opacity duration-300 ease-in-out';
    
    // Format the remaining cooldown time
    chrome.storage.local.get(['youtubeCooldownEndTime'], function(result) {
        let remainingTime = '';
        let endTime = result.youtubeCooldownEndTime || 0;
        
        if (endTime > Date.now()) {
            const timeLeft = Math.ceil((endTime - Date.now()) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (minutes > 0) {
                remainingTime = `${minutes}m ${seconds}s`;
            } else {
                remainingTime = `${seconds}s`;
            }
        }
        
        blockingOverlay.innerHTML = `
            <div class="bg-white rounded-2xl p-10 max-w-[550px] w-full shadow-lg flex flex-col text-center font-sans">
                <h2 class="text-3xl font-semibold text-gray-900 mb-4">Cooldown Period</h2>
                <p class="text-xl text-gray-600 mb-4">Your YouTube session has ended.</p>
                <p class="text-lg text-gray-700 mb-8">Please wait before starting your next session.</p>
                <div class="bg-gray-100 p-4 rounded-xl my-4">
                    <p id="cooldown-timer" class="text-2xl font-bold text-blue-600">${remainingTime}</p>
                </div>
            </div>
        `;
        
        // Add overlay to page
        document.body.appendChild(blockingOverlay);
        console.log('Cooldown overlay added');

        // Prevent scrolling of the body
        document.body.classList.add('overflow-hidden', 'h-full', 'w-full', 'fixed');
        
        // Update the timer every second
        const timerElement = blockingOverlay.querySelector('#cooldown-timer');
        
        if (cooldownTimer) {
            clearInterval(cooldownTimer);
        }
        
        cooldownTimer = setInterval(() => {
            const now = Date.now();
            if (endTime <= now) {
                clearInterval(cooldownTimer);
                cooldownTimer = null;
                isInCooldown = false;
                return;
            }
            
            const timeLeft = Math.ceil((endTime - now) / 1000);
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            if (minutes > 0) {
                timerElement.textContent = `${minutes}m ${seconds}s`;
            } else {
                timerElement.textContent = `${seconds}s`;
            }
        }, 1000);
    });
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
        const expiryTime = Date.now() + (timeLimit * 60000);
        
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
        isInCooldown = false;
        
        // Remove overlay if it exists
        if (blockingOverlay) {
            removeBlockingOverlay();
        }
        
        sendResponse({success: true});
    } else if (request.action === 'intentionExpired') {
        console.log('Intention expired');
        
        // Start cooldown period
        isYouTubeBlocked = true;
        isInCooldown = true;
        
        // Get cooldown time from storage
        chrome.storage.local.get(['youtubeCooldownTime'], function(result) {
            const cooldownTime = result.youtubeCooldownTime || 2; // Default to 2 minutes
            const cooldownEndTime = Date.now() + (cooldownTime * 60000);
            
            // Save cooldown end time to storage
            chrome.storage.local.set({
                youtubeCooldownEndTime: cooldownEndTime
            }, function() {
                console.log('Cooldown started, ends at:', new Date(cooldownEndTime));
                
                // Pause video before showing overlay
                pauseVideo();
                
                // Show cooldown overlay
                showCooldownOverlay();
            });
        });
        
        sendResponse({success: true});
    } else if (request.action === 'cooldownEnded') {
        console.log('Cooldown ended');
        
        // Update state
        isInCooldown = false;
        
        // Show regular blocking overlay
        showBlockingOverlay();
        
        sendResponse({success: true});
    } else if (request.action === 'clearIntention') {
        console.log('Intention cleared');
        
        // Pause video before showing overlay
        pauseVideo();
        
        // Set to blocked and show overlay
        isYouTubeBlocked = true;
        isInCooldown = false;
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