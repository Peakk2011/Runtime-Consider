const Consider = {
    reset() {
        localStorage.clear();

        (window as any).entries = [];
        (window as any).todayCommitted = false;

        (window as any).todayInput.value = "";
        (window as any).todayInput.disabled = false;
        (window as any).commitBtn.disabled = false;
        (window as any).committedNotice.style.display = "none";
        (window as any).historyContainer.innerHTML = '<div class="history-empty">no entries yet</div>';

        console.log("reset(): cleared all entries and reset state");
    },

    revert() {
        localStorage.removeItem(`entry:${(window as any).today}`);
        
        (window as any).entries = ((window as any).entries || []).filter((e: any) => e.date !== (window as any).today);

        (window as any).todayCommitted = false;
        (window as any).todayInput.disabled = false;
        (window as any).commitBtn.disabled = false;
        (window as any).committedNotice.style.display = "none";
        (window as any).todayInput.value = "";

        if (typeof (window as any).renderHistory === 'function') {
            (window as any).renderHistory();
        }

        console.log("revert(): removed today's entry and reverted progress");
    }
};

(window as any).Consider = Consider;