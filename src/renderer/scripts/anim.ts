// Frontend elements animations 

/**
 * Magnetic effect for history text elements
 * Elements follow mouse when nearby and snap back when mouse moves away
 */
export const initializeMagneticEffect = (): void => {
    const magneticElements = document.querySelectorAll('.history-text');

    const ATTRACTION_RADIUS = 140;
    const MAX_DISPLACEMENT = 12;
    const LERP_FACTOR = 0.08;

    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    magneticElements.forEach((element) => {
        const el = element as HTMLElement;

        let currentX = 0;
        let currentY = 0;
        let targetX = 0;
        let targetY = 0;

        const update = () => {
            currentX += (targetX - currentX) * LERP_FACTOR;
            currentY += (targetY - currentY) * LERP_FACTOR;

            el.style.transform = `translate(${currentX}px, ${currentY}px)`;
            requestAnimationFrame(update);
        };

        update();

        document.addEventListener('mousemove', () => {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = mouseX - cx;
            const dy = mouseY - cy;
            const distance = Math.hypot(dx, dy);

            if (distance < ATTRACTION_RADIUS) {
                // easing curve (soft falloff)
                const t = 1 - distance / ATTRACTION_RADIUS;
                const ease = t * t; // quadratic easing

                targetX = (dx / distance) * ease * MAX_DISPLACEMENT;
                targetY = (dy / distance) * ease * MAX_DISPLACEMENT;

                // el.style.cursor = 'none';
            } else {
                targetX = 0;
                targetY = 0;
                // el.style.cursor = 'auto';
            }
        });

        el.addEventListener('mouseleave', () => {
            targetX = 0;
            targetY = 0;
            // el.style.cursor = 'auto';
        });
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMagneticEffect);
} else {
    initializeMagneticEffect();
}
