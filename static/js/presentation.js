// Load presentation data
let presentationData = {
    slides: [],
    currentSlide: 0
};

// Generate array of 64 slides
presentationData.slides = Array.from({length: 64}, (_, i) => ({
    imageUrl: `/static/presentations/benchmark-tco/images/Slide${i + 1}.jpg`,
    title: `Slide ${i + 1}`,
    number: i + 1
}));

// Initialize presentation controls
document.addEventListener('DOMContentLoaded', () => {
    const prevButton = document.getElementById('prevSlide');
    const nextButton = document.getElementById('nextSlide');
    
    // Initialize presentationController
    window.presentationController.updateSlide();

    // Function to notify slide change
    function notifySlideChange(slideNumber) {
        // Add slide change to conversation
        if (window.sendMessageToAI) {
            window.sendMessageToAI(`[SLIDE_CHANGE:${slideNumber}]`, true);
        }
    }

    // Button click handlers
    prevButton.addEventListener('click', () => {
        window.presentationController.previousSlide();
        notifySlideChange(window.presentationController.getCurrentSlide());
    });

    nextButton.addEventListener('click', () => {
        window.presentationController.nextSlide();
        notifySlideChange(window.presentationController.getCurrentSlide());
    });

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            window.presentationController.previousSlide();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            window.presentationController.nextSlide();
        }
    });

    // Expose current slide data for the AI
    window.getCurrentSlideInfo = () => {
        return {
            currentSlide: window.presentationController.getCurrentSlide(),
            totalSlides: window.presentationController.totalSlides
        };
    };
});