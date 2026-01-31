export const createSlideActionModal = (
    onSuccess: () => void,
    options?: { 
        accentColor?: string;
        initialHeight?: number; // default 240px
    }
): HTMLElement => {
    let cleanupFns: Array<() => void> = [];
    const addCleanup = (fn: () => void) => cleanupFns.push(fn);

    const overlay = document.createElement('div');
    overlay.className = 'action-modal-overlay shutdown-style';

    // Minimal structure
    const track = document.createElement('div');
    track.className = 'slide-track-vertical';
    
    const arrow = document.createElement('div');
    arrow.className = 'hint-arrow';
    arrow.textContent = '▼'; 
    
    const button = document.createElement('div');
    button.className = 'slide-button-vertical';
    button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    `;

    track.appendChild(arrow);
    track.appendChild(button);
    overlay.appendChild(track);

    // State
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;
    let currentHeight = options?.initialHeight || 240;
    let maxHeight = window.innerHeight;
    let rafId: number | null = null;

    // Constants
    const MIN_HEIGHT = options?.initialHeight || 240;
    const THRESHOLD = 0.98;

    const updateHeight = (h: number, animate = false) => {
        const clamped = Math.max(MIN_HEIGHT, Math.min(maxHeight, h));
        currentHeight = clamped;
        
        if (animate) {
            track.style.transition = 'height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        } else {
            track.style.transition = 'none';
        }
        
        track.style.height = `${clamped}px`;
        
        // Arrow fade out when dragged
        const progress = (clamped - MIN_HEIGHT) / (maxHeight - MIN_HEIGHT);
        arrow.style.opacity = `${1 - (progress * 1.5)}`;
        arrow.style.transform = `translateX(-50%) translateY(${progress * 10}px)`;
        
        // Color fill based on progress
        if (options?.accentColor) {
            track.style.background = `linear-gradient(to bottom, 
                ${options.accentColor} 0%, 
                ${options.accentColor} ${progress * 100}%, 
                var(--theme-bg-1-default) ${progress * 100}%)`;
        }
    };

    const animateTo = (targetHeight: number, onComplete?: () => void) => {
        if (rafId) cancelAnimationFrame(rafId);
        
        track.style.transition = 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        track.style.height = `${targetHeight}px`;
        currentHeight = targetHeight;
        
        if (targetHeight === MIN_HEIGHT) {
            arrow.style.opacity = '0.6';
            arrow.style.transform = 'translateX(-50%) translateY(0)';
        }
        
        setTimeout(() => {
            track.style.transition = 'none';
            onComplete?.();
        }, 500);
    };

    // Resize handler
    const handleResize = () => {
        maxHeight = window.innerHeight;
        if (currentHeight > maxHeight) {
            updateHeight(maxHeight);
        }
    };
    window.addEventListener('resize', handleResize);
    addCleanup(() => window.removeEventListener('resize', handleResize));

    // Input handlers
    const handleStart = (clientY: number) => {
        isDragging = true;
        startY = clientY;
        startHeight = currentHeight;
        button.classList.add('dragging');
        track.style.transition = 'none';
        
        // Disable selection
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.overflow = 'hidden'; 
    };

    const handleMove = (clientY: number) => {
        if (!isDragging) return;
        
        const deltaY = clientY - startY;
        const newHeight = startHeight + deltaY;
        
        updateHeight(newHeight);
        
        // Auto-trigger if pulled to top with momentum
        if (currentHeight >= maxHeight * THRESHOLD) {
            handleEnd(true);
        }
    };

    const handleEnd = (forced = false) => {
        if (!isDragging && !forced) return;
        isDragging = false;
        
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.overflow = '';
        button.classList.remove('dragging');
        
        const progress = currentHeight / maxHeight;
        
        if (progress >= THRESHOLD || forced) {
            // Success - fill screen
            button.classList.add('success');
            animateTo(maxHeight, () => {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.4s ease';
                setTimeout(() => {
                    cleanup();
                    document.body.removeChild(overlay);
                    onSuccess();
                }, 400);
            });
        } else {
            // Snap back
            animateTo(MIN_HEIGHT);
        }
    };

    // Event listeners
    const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        handleStart(e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();

    const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        handleStart(e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        handleMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleEnd();

    // Attach to button (and track for better UX)
    button.addEventListener('mousedown', onMouseDown);
    button.addEventListener('touchstart', onTouchStart, { passive: false });
    track.addEventListener('mousedown', onMouseDown);
    track.addEventListener('touchstart', onTouchStart, { passive: false });
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);

    addCleanup(() => {
        button.removeEventListener('mousedown', onMouseDown);
        button.removeEventListener('touchstart', onTouchStart);
        track.removeEventListener('mousedown', onMouseDown);
        track.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    });

    const cleanup = () => {
        cleanupFns.forEach(fn => fn());
        cleanupFns = [];
    };

    // Close on backdrop click (outside track)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && currentHeight <= MIN_HEIGHT + 10) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                cleanup();
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        }
    });

    // Init
    updateHeight(MIN_HEIGHT);

    return overlay;
};

export const exitRuntimeConsider = (
    onSuccess: () => void,
    options?: { accentColor?: string; initialHeight?: number }
): void => {
    const modal = createSlideActionModal(onSuccess, options);
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
        modal.classList.add('show');
    });
};