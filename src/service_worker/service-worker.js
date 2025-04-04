// Service Worker initialization
console.log('Service Worker initialized');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Add message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Handle messages from content script or popup
    console.log('Message received:', request);
    return true;
}); 