document.addEventListener("DOMContentLoaded", function() {
    const uploadButton = document.getElementById("uploadButton");
    const imageInput = document.getElementById("imageInput");
    const resultText = document.getElementById("result");
    const dropZone = document.getElementById("dropZone");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const imagePreview = document.getElementById("imagePreview");

    // Notify background script that popup is open
    chrome.windows.getCurrent((window) => {
        chrome.runtime.sendMessage({
            action: "popupOpened",
            windowId: window.id
        });
    });

    // Function to handle file selection
    function handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            resultText.innerText = "Please select a valid image.";
            return false;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = "block";
            resultText.innerText = "";
        };
        reader.readAsDataURL(file);
        return true;
    }

    // Function to analyze image
    async function analyzeImage(file) {
        if (!file) return;

        loadingIndicator.style.display = "block";
        resultText.innerText = "Analyzing...";

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://127.0.0.1:8000/predict/", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data = await response.json();
            resultText.innerText = `Prediction: ${data.prediction.toUpperCase()} (${data.confidence || "Unknown"}% confidence)`;
            resultText.className = data.prediction.toLowerCase() === "fake" ? "fake-result" : "real-result";
        } catch (error) {
            resultText.innerText = "Error detecting deepfake.";
        } finally {
            loadingIndicator.style.display = "none";
        }
    }

    // Handle file input change
    imageInput.addEventListener("change", function() {
        if (this.files && this.files[0]) {
            handleFileSelect(this.files[0]);
        }
    });

    // Upload button click
    uploadButton.addEventListener("click", async () => {
        if (imageInput.files.length) {
            await analyzeImage(imageInput.files[0]);
        } else {
            resultText.innerText = "Please select an image first.";
        }
    });

    // Drag-and-drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (handleFileSelect(file)) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            imageInput.files = dataTransfer.files;
            analyzeImage(file);
        }
    });

    // Handle drag from web images
    chrome.runtime.onMessage.addListener(function(request) {
        if (request.action === "imageDropped" && request.imageUrl) {
            fetch(request.imageUrl)
                .then(response => response.blob())
                .then(blob => {
                    const file = new File([blob], "image.jpg", { type: blob.type });
                    if (handleFileSelect(file)) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        imageInput.files = dataTransfer.files;
                        analyzeImage(file);
                    }
                })
                .catch(() => {
                    resultText.innerText = "Error fetching image from web.";
                });
        }
    });
});