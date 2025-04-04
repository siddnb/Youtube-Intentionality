// Content script initialization
console.log('Content script loaded');

// Function to initialize the content script
function initialize() {
    console.log('Content script initialized');
    
    // Inject CSS
    injectStyles();
    
    // Check if user has set an intention
    checkIntention();
}

// Function to inject CSS
function injectStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('content/content.css');
    document.head.appendChild(link);
}

// Function to check if an intention is set
function checkIntention() {
    chrome.storage.local.get(['youtubeIntention'], function(result) {
        if (result.youtubeIntention) {
            console.log('User intention:', result.youtubeIntention);
            
            // Display intention banner
            //displayIntentionBanner(result.youtubeIntention);
        }
    });
}

// Function to display an intention banner
function displayIntentionBanner(intention) {
    // Create banner element
    const banner = document.createElement('div');
    banner.className = 'yt-intention-banner';
    banner.innerHTML = `
        <div class="yt-intention-text">Watching intention: ${intention}</div>
        <button id="clearIntention" class="yt-intention-clear">Clear</button>
    `;
    
    // Add banner to page
    document.body.prepend(banner);
    
    // Add event listener to clear button
    document.getElementById('clearIntention').addEventListener('click', function() {
        chrome.storage.local.remove(['youtubeIntention'], function() {
            console.log('Intention cleared');
            banner.remove();
        });
    });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'setIntention') {
        console.log('Received intention:', request.intention);
        displayIntentionBanner(request.intention);
    }
    return true;
});

// Run initialization when the page is fully loaded
if (document.readyState === 'complete') {
    initialize();
} else {
    window.addEventListener('load', initialize);
} 