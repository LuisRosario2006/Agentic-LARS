// Global object to expose presentation control methods
window.presentationController = {
    currentSlide: 0,
    totalSlides: 64,

    // Method to move to next slide
    nextSlide: function() {
        if (this.currentSlide < this.totalSlides - 1) {
            this.currentSlide++;
            this.updateSlide();
            return true;
        }
        return false;
    },

    // Method to move to previous slide
    previousSlide: function() {
        if (this.currentSlide > 0) {
            this.currentSlide--;
            this.updateSlide();
            return true;
        }
        return false;
    },

    // Method to go to a specific slide
    goToSlide: function(slideNumber) {
        if (slideNumber >= 1 && slideNumber <= this.totalSlides) {
            this.currentSlide = slideNumber - 1;
            this.updateSlide();
            return true;
        }
        return false;
    },

    // Method to get current slide number
    getCurrentSlide: function() {
        return this.currentSlide + 1;
    },

    // Internal method to update slide
    updateSlide: function() {
        // Get slide from presentationData
        const slide = presentationData.slides[this.currentSlide];
        
        // Update header
        const slideHeader = document.querySelector('.slide-header');
        slideHeader.querySelector('span:first-child').textContent = `Slide ${slide.number}`;
        
        // Update content
        const slideContent = document.getElementById('slideContent');
        slideContent.innerHTML = `
            <img src="${slide.imageUrl}" alt="Slide ${slide.number}" class="slide-image">
        `;

        // Update button states
        const prevButton = document.getElementById('prevSlide');
        const nextButton = document.getElementById('nextSlide');
        prevButton.disabled = this.currentSlide === 0;
        nextButton.disabled = this.currentSlide === this.totalSlides - 1;
    }
};