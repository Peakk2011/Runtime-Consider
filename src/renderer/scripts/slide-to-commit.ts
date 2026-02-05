import { translationStrings } from './i18n';

const escapeHtmlContent = (textContent: string): string => {
    const temporaryDiv = document.createElement("div");
    temporaryDiv.textContent = textContent;
    return temporaryDiv.innerHTML;
};

export const createSlideToCommitModal = (onCommit: () => void): HTMLElement => {
    // Cleanup function
    let cleanupFns: Array<() => void> = [];
    const addCleanup = (fn: () => void) => cleanupFns.push(fn);

    const overlay = document.createElement('div');
    overlay.className = 'commit-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'commit-modal';

    const slideText = escapeHtmlContent(
        translationStrings?.slideToCommitText || "Slide to Commit"
    );
    const modalTitle = escapeHtmlContent(
        translationStrings?.commitModalTitle || "Commit Entry"
    );
    const modalMessage = escapeHtmlContent(
        translationStrings?.commitModalMessage || "This action is permanent and cannot be undone."
    );
    const encouragementInitial = escapeHtmlContent(
        translationStrings?.encouragementKeepGoing || "Keep going!"
    );
    const cancelText = escapeHtmlContent(
        translationStrings?.cancelButtonText || "Cancel"
    );

    modal.innerHTML = `
        <h3 class="commit-modal-title">${modalTitle}</h3>
        <p class="commit-modal-message">${modalMessage}</p>
        <div class="slide-to-commit-container">
            <div class="slide-track">
                <span class="slide-text">${slideText}</span>
                <div class="slide-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
                <div class="encouragement-emoji">
                    <div class="emoji-icon">💪</div>
                    <div class="emoji-label">${encouragementInitial}</div>
                </div>
            </div>
        </div>
        <button class="commit-modal-cancel">${cancelText}</button>
    `;

    overlay.appendChild(modal);

    // Elements
    const sliderTrack = modal.querySelector('.slide-track') as HTMLElement;
    const sliderButton = modal.querySelector('.slide-button') as HTMLElement;
    const sliderText = modal.querySelector('.slide-text') as HTMLElement;
    const encouragementEmoji = modal.querySelector('.encouragement-emoji') as HTMLElement;
    const cancelBtn = modal.querySelector('.commit-modal-cancel') as HTMLButtonElement;

    // State
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxSlide = 0;
    let rafId: number | null = null;
    let velocity = 0;
    let lastX = 0;
    let lastTime = 0;
    let animationFrameId: number | null = null;

    // Physics constants
    const FRICTION = 0.95;
    const SNAP_THRESHOLD = 0.95;
    const VELOCITY_THRESHOLD = 0.5;

    const getEmojiForProgress = (progress: number) => {
        if (progress < 0.2) return { emoji: '💪', label: translationStrings?.encouragementKeepGoing || 'Keep going!' };
        if (progress < 0.4) return { emoji: '🔥', label: translationStrings?.encouragementOnFire || 'You\'re on fire!' };
        if (progress < 0.6) return { emoji: '⚡', label: translationStrings?.encouragementAlmostThere || 'Almost there!' };
        if (progress < 0.8) return { emoji: '🚀', label: translationStrings?.encouragementSoClose || 'So close!' };
        if (progress < 0.95) return { emoji: '✨', label: translationStrings?.encouragementOneMorePush || 'One more push!' };
        return { emoji: '🎉', label: translationStrings?.encouragementSuccess || 'Success!' };
    };

    const updateDimensions = () => {
        const trackWidth = sliderTrack.offsetWidth;
        const buttonWidth = sliderButton.offsetWidth;
        maxSlide = trackWidth - buttonWidth - 8; // 8px margin
    };

    const resizeObserver = new ResizeObserver(() => {
        updateDimensions();
        if (currentX > maxSlide) {
            currentX = maxSlide;
            updateUI(currentX);
        }
    });
    resizeObserver.observe(sliderTrack);
    addCleanup(() => resizeObserver.disconnect());

    const updateUI = (x: number) => {
        const progress = Math.max(0, Math.min(1, x / maxSlide));
        
        // Hardware acceleration
        sliderButton.style.transform = `translate3d(${x}px, 0, 0)`;
        
        // Update text opacity
        sliderText.style.opacity = `${1 - progress}`;
        
        // Gradient progress
        sliderTrack.style.background = `linear-gradient(to right, 
            var(--theme-accent-1-default) ${progress * 100}%, 
            var(--theme-bg-3-default) ${progress * 100}%)`;

        // Emoji updates
        const { emoji, label } = getEmojiForProgress(progress);
        const emojiIcon = encouragementEmoji.querySelector('.emoji-icon');
        const emojiLabel = encouragementEmoji.querySelector('.emoji-label');
        
        if (emojiIcon) emojiIcon.textContent = emoji;
        if (emojiLabel) emojiLabel.textContent = label;

        // Position emoji
        encouragementEmoji.style.transform = `translate3d(${x}px, 0, 0)`;
        
        // Tilt effect based on velocity
        const tilt = Math.max(-15, Math.min(15, velocity * 2));
        encouragementEmoji.style.setProperty('--tilt', `${tilt}deg`);

        // Visibility
        if (isDragging && progress > 0.02) {
            encouragementEmoji.classList.add('visible');
        } else if (!isDragging) {
            encouragementEmoji.classList.remove('visible');
        }

        // Success state
        if (progress > SNAP_THRESHOLD) {
            sliderButton.classList.add('success');
        } else {
            sliderButton.classList.remove('success');
        }
    };

    // RAF Loop
    const animate = () => {
        if (!isDragging && Math.abs(velocity) > 0.1) {
            // Inertia physics when release
            currentX += velocity;
            velocity *= FRICTION;

            // Bounce back 
            if (currentX < 0) {
                currentX = 0;
                velocity = 0;
            } else if (currentX > maxSlide) {
                currentX = maxSlide;
                velocity = 0;
            }

            updateUI(currentX);
            animationFrameId = requestAnimationFrame(animate);
        } else if (!isDragging) {
            // Snap to nearest
            const progress = currentX / maxSlide;
            if (progress < SNAP_THRESHOLD && currentX > 0) {
                // Spring back to start
                currentX = 0;
                sliderButton.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                sliderButton.style.transform = `translate3d(0px, 0, 0)`;
                encouragementEmoji.style.transform = `translate3d(0px, 0, 0)`;
                
                setTimeout(() => {
                    sliderButton.style.transition = '';
                }, 400);
            }
            animationFrameId = null;
        }
    };

    const handleStart = (clientX: number) => {
        isDragging = true;
        velocity = 0;
        lastX = clientX;
        lastTime = Date.now();

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        sliderButton.classList.add('dragging');
        sliderButton.style.transition = 'none';
        encouragementEmoji.style.transition = 'none';

        const trackRect = sliderTrack.getBoundingClientRect();
        const buttonRect = sliderButton.getBoundingClientRect();
        startX = clientX - buttonRect.left;

        document.body.style.userSelect = 'none';
    };

    const handleMove = (clientX: number) => {
        if (!isDragging) return;

        const now = Date.now();
        const dt = now - lastTime;
        
        if (dt > 0) {
            velocity = (clientX - lastX) / dt * 16; // normalize to ~60fps
        }
        
        lastX = clientX;
        lastTime = now;

        const trackRect = sliderTrack.getBoundingClientRect();
        let x = clientX - trackRect.left - startX;
        
        if (x < 0) {
            x = x * 0.3;
        } else if (x > maxSlide) {
            x = maxSlide + (x - maxSlide) * 0.3;
        }
        
        currentX = x;
        updateUI(currentX);

        const progress = currentX / maxSlide;
        if (progress > SNAP_THRESHOLD && Math.abs(velocity) > VELOCITY_THRESHOLD) {
            handleEnd();
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        document.body.style.userSelect = '';
        sliderButton.classList.remove('dragging');
        
        const progress = currentX / maxSlide;

        if (progress > SNAP_THRESHOLD) {
            currentX = maxSlide;
            updateUI(currentX);
            
            const committedText = translationStrings?.commitSuccessText || 'Committed!';
            sliderText.textContent = committedText;
            sliderButton.classList.add('success');
            
            const emojiIcon = encouragementEmoji.querySelector('.emoji-icon');
            const emojiLabel = encouragementEmoji.querySelector('.emoji-label');
            if (emojiIcon) emojiIcon.textContent = '🎉';
            const successText = translationStrings?.commitSuccessText || 'Success!';
            if (emojiLabel) emojiLabel.textContent = successText;
            
            encouragementEmoji.style.transform = `translate3d(${maxSlide}px, 0, 0) scale(1.2)`;
            
            setTimeout(() => {
                overlay.classList.add('fade-out');
                setTimeout(() => {
                    cleanup();
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                    onCommit();
                }, 300);
            }, 400);
        } else {
            // Start spring animation
            animationFrameId = requestAnimationFrame(animate);
        }
    };

    // Event Listeners with proper cleanup
    const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientX);
    };
    
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    
    const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        handleStart(e.touches[0].clientX);
    };
    
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault(); 
        handleMove(e.touches[0].clientX);
    };
    
    const onTouchEnd = () => handleEnd();

    sliderButton.addEventListener('mousedown', onMouseDown);
    sliderButton.addEventListener('touchstart', onTouchStart, { passive: false });
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    
    addCleanup(() => {
        sliderButton.removeEventListener('mousedown', onMouseDown);
        sliderButton.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    });

    // Cancel & Close
    const closeModal = () => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            cleanup();
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 300);
    };

    const onOverlayClick = (e: MouseEvent) => {
        if (e.target === overlay) closeModal();
    };

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', onOverlayClick);
    
    addCleanup(() => {
        cancelBtn.removeEventListener('click', closeModal);
        overlay.removeEventListener('click', onOverlayClick);
    });

    // Cleanup function
    const cleanup = () => {
        cleanupFns.forEach(fn => fn());
        cleanupFns = [];
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        document.body.style.userSelect = '';
    };

    // Initialize dimensions
    updateDimensions();

    return overlay;
};

export const showSlideToCommitModal = (onCommit: () => void): void => {
    const modal = createSlideToCommitModal(onCommit);
    document.body.appendChild(modal);
    
    // Force reflow
    modal.offsetHeight;
    
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
};
