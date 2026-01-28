const Consider = {
    /**
     * Reset - Hides the commit button but keeps data
     * Restores UI to initial state without deleting entries
     */
    reset() {
        // Hide commit button and restore input for editing
        (window as any).todayInput.style.display = "block";
        (window as any).todayInput.disabled = false;
        (window as any).todayInput.value = "";
        (window as any).commitBtn.disabled = false;
        (window as any).commitBtn.style.display = "flex";
        (window as any).committedNotice.style.display = "none";
        (window as any).todayCommitted = false;

        // Re-render history
        if (typeof (window as any).renderHistory === 'function') {
            (window as any).renderHistory();
        }
    }
};

(window as any).Consider = Consider;