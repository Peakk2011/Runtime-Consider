import { initializeMagneticEffect } from './anim';
import type { Entry } from './types';
import { todayDateString } from './constants';
import { translationStrings } from './i18n';
import { loadAllEntries, saveEntry, getTodayEntry } from './storage';
import { renderHistoryView, autoExpandTextarea, updateTodayUI } from './ui';
import { createHamburgerMenu } from './menu';
import { showSlideToCommitModal } from './slide-to-commit';
import { runtimeConsiderSafeMode, isSafeMode } from './safe-mode';
// import { getStorage } from '@/core/storage/storageManager';

window.addEventListener("error", (event) => {
    runtimeConsiderSafeMode("window.error", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
    runtimeConsiderSafeMode("unhandledrejection", event.reason);
});

window.electron.app.getOS().then(os => {
    document.body.classList.add(`os-${os}`);
}).catch(console.error);

// Application state
let isTodayCommitted = false;

// DOM elements
const todayDateLabel = document.getElementById("todayLabel") as HTMLDivElement;
const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement;
const commitButton = document.getElementById("commitBtn") as HTMLButtonElement;

// Set today's date label
if (todayDateLabel) {
    todayDateLabel.textContent = todayDateString;
} else {
    runtimeConsiderSafeMode("Missing today label element");
}

// Entry commit handler
const handleCommitEntry = async (): Promise<void> => {
    if (isSafeMode()) return;
    
    const trimmedText = todayTextInput.value.trim();

    if (!trimmedText || isTodayCommitted) {
        return;
    }

    // Show slide-to-commit modal instead of confirm dialog
    showSlideToCommitModal(async () => {
        const newEntry: Entry = {
            date: todayDateString,
            text: trimmedText,
            timestamp: new Date().toISOString(),
            committed: true,
        };

        try {
            await saveEntry(newEntry);

            updateTodayUI(newEntry);
            
            isTodayCommitted = true;

            renderHistoryView();

            todayTextInput.removeEventListener('input', handleTextareaInput);
            todayTextInput.removeEventListener('keydown', handleTextareaKeydown);
            
            initializeMagneticEffect();

        } catch (error) {
            console.error("Failed to commit entry:", error);
            alert("Failed to commit. Please try again.");
        }
    });
};

// Textarea event handlers
const handleTextareaInput = (): void => {
    if (isSafeMode()) return;
    if (!isTodayCommitted) {
        autoExpandTextarea(todayTextInput);
    }
};

const handleTextareaKeydown = (event: KeyboardEvent): void => {
    if (isSafeMode()) return;
    const isCommitShortcut = (event.metaKey || event.ctrlKey) && event.key === "Enter";

    if (isCommitShortcut) {
        handleCommitEntry();
    }
};

// Initialize app
const initializeApp = async (): Promise<void> => {
    try {
        renderHistoryView({ initialLimit: 0, batchSize: 16, skipEffects: true });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await loadAllEntries();

        const todayEntry = getTodayEntry();

        if (todayEntry) {
            updateTodayUI(todayEntry);
            isTodayCommitted = true;
        } else {
            todayTextInput.focus();
        }

        runtimeConsiderIdle(() => {
            renderHistoryView({ initialLimit: 12, batchSize: 20 });
        });

    } catch (error) {
        console.error("Failed to initialize app:", error);
        runtimeConsiderSafeMode("initializeApp failed", error);
        todayTextInput?.focus();
    }
};

// Event listeners
if (!commitButton || !todayTextInput) {
    runtimeConsiderSafeMode("Missing required input elements");
} else {
    commitButton.addEventListener("click", handleCommitEntry);
    todayTextInput.addEventListener("keydown", handleTextareaKeydown);
    todayTextInput.addEventListener("input", handleTextareaInput);
}

// Start the app
initializeApp();

// Create hamburger menu (defer to idle)
const runtimeConsiderIdle = (fn: () => void) => {
    if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback?: (cb: () => void) => void })
            .requestIdleCallback?.(fn);
    } else {
        setTimeout(fn, 0);
    }
};

runtimeConsiderIdle(() => {
    createHamburgerMenu().catch((error) => {
        console.error('Failed to create hamburger menu', error);
        runtimeConsiderSafeMode("createHamburgerMenu failed", error);
    });
});

if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (event) => {
        const isDevToolsShortcut = 
            event.key === 'F12' ||
            (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(event.key.toUpperCase()));

        if (isDevToolsShortcut) {
            event.preventDefault();
            return false;
        }
    });
}

// Uncomment to delete all data
// if (process.env.NODE_ENV === 'development') {
//     getStorage().deleteAllData()
//     .then(() => {
//         console.log('All data deleted successfully.');
//         // You might want to quit and restart the app here
//     })
//     .catch(error => {
//         console.error('Failed to delete data:', error);
//     });
// }
