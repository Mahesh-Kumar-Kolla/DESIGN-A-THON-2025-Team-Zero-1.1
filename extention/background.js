// Store the popup window ID
let popupWindowId = null;
let isDragging = false;
let pendingImageUrl = null;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startDrag") {
        isDragging = true;
        pendingImageUrl = request.imageUrl;
        
        // Open popup if not already open
        ensurePopupIsOpen();
    } else if (request.action === "endDrag") {
        isDragging = false;
        
        // If we have a pending image URL, send it to the popup
        if (pendingImageUrl && popupWindowId) {
            chrome.runtime.sendMessage({
                action: "imageDropped",
                imageUrl: pendingImageUrl
            });
            pendingImageUrl = null;
        }
    } else if (request.action === "imageDropped") {
        // Forward the message to the popup if it's open
        chrome.runtime.sendMessage(request);
    } else if (request.action === "popupOpened") {
        // Store the window ID when popup opens
        popupWindowId = request.windowId;
        sendResponse({success: true});
        
        // If we have a pending image URL, send it to the popup
        if (pendingImageUrl) {
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: "imageDropped",
                    imageUrl: pendingImageUrl
                });
                pendingImageUrl = null;
            }, 500); // Small delay to ensure popup is ready
        }
    }
    return true;
});

// Ensure popup is open
function ensurePopupIsOpen() {
    if (popupWindowId) {
        chrome.windows.get(popupWindowId, {}, (window) => {
            if (chrome.runtime.lastError) {
                // Window doesn't exist anymore, create a new one
                createPopupWindow();
            } else {
                // Focus the existing window and ensure it's on top
                chrome.windows.update(popupWindowId, {
                    focused: true,
                    // Set alwaysOnTop to true to keep the window on top
                    alwaysOnTop: true
                });
            }
        });
    } else {
        createPopupWindow();
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
    ensurePopupIsOpen();
});

// Function to create popup window
function createPopupWindow() {
    chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 500,
        height: 600,
        focused: true,
        // Set alwaysOnTop to true to keep the window on top
        alwaysOnTop: true
    }, (window) => {
        popupWindowId = window.id;
    });
}

// Listen for window close events to reset the popupWindowId
chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === popupWindowId) {
        popupWindowId = null;
    }
});

// Add a listener for when the browser window gets focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    // If the focus changed to a window that's not our popup and we have a popup open
    if (windowId !== popupWindowId && popupWindowId !== null) {
        // Re-focus our popup window to bring it to the front
        chrome.windows.update(popupWindowId, {
            focused: true,
            alwaysOnTop: true
        });
    }
});