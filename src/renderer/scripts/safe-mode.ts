let isInSafeMode = false;

export const isSafeMode = (): boolean => isInSafeMode;

export const runtimeConsiderSafeMode = (reason: string, error?: unknown): void => {
    if (isInSafeMode) return;
    
    isInSafeMode = true;

    try {
        console.error("Entering Safe Mode:", reason, error);
        document.body.classList.add("safe-mode");

        const overlay = document.createElement("div");
        overlay.className = "safe-mode-overlay";
        overlay.innerHTML = `
            <div class="safe-mode-card">
                <div class="safe-mode-title">Safe Mode</div>
                <div class="safe-mode-message">
                    The app encountered an unexpected error and switched to Safe Mode.
                </div>
                <div class="safe-mode-actions">
                    <button class="safe-mode-btn" data-action="reload">Reload</button>
                    <button class="safe-mode-btn safe-mode-secondary" data-action="exit">Exit</button>
                </div>
            </div>
        `;

        const existing = document.querySelector(".safe-mode-overlay");

        if (existing) {
            existing.remove();
        }

        document.body.appendChild(overlay);

        overlay.addEventListener("click", (event) => {
            const target = event.target as HTMLElement | null;
            const action = target?.getAttribute("data-action");
            if (action === "reload") {
                location.reload();
            }
            if (action === "exit") {
                window.electron.app.exit();
            }
        });

        const commitButton = document.getElementById("commitBtn") as HTMLButtonElement | null;
        const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement | null;

        commitButton?.setAttribute("disabled", "true");
        todayTextInput?.setAttribute("disabled", "true");
    } catch (fatalError) {
        console.error("Failed to enter Safe Mode:", fatalError);
    }
};
