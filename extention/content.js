// Track if we're in a drag operation
let isDragging = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "popupOpened") {
        sendResponse({success: true});
    }
    return true;
});

// Add event listeners to all images
function addDragListeners() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.width < 50 || img.height < 50) return;

        img.setAttribute('draggable', 'true');

        img.addEventListener('dragstart', function(e) {
            isDragging = true;
            e.dataTransfer.setData('text/plain', img.src);
            
            // Send message to background script to open popup if not already open
            chrome.runtime.sendMessage({
                action: "startDrag", 
                imageUrl: img.src
            });
        });
        
        img.addEventListener('dragend', function() {
            isDragging = false;
            // Notify background that drag has ended
            chrome.runtime.sendMessage({
                action: "endDrag"
            });
        });
    });
}

// Run when page loads
document.addEventListener('DOMContentLoaded', addDragListeners);

// Observe changes for dynamically loaded images
const observer = new MutationObserver(() => {
    addDragListeners();
});
observer.observe(document.body, {childList: true, subtree: true});