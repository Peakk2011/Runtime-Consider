interface Entry {
    date: string;
    text: string;
    timestamp: string;
}

interface StorageAPI {
    list(prefix: string): Promise<{ keys: string[] }>;
    get(key: string): Promise<{ value: string } | null>;
    set(key: string, value: string): Promise<void>;
}

const storage: StorageAPI = {
    async list(prefix: string) {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return { keys };
    },
    async get(key: string) {
        const value = localStorage.getItem(key);
        return value ? { value } : null;
    },
    async set(key: string, value: string) {
        localStorage.setItem(key, value);
    }
};

declare global {
    interface Window {
        storage: StorageAPI;
    }
}

window.storage = storage;

const today: string = new Date().toISOString().split("T")[0];
let todayCommitted = false;
let entries: Entry[] = [];

const todayLabel = document.getElementById("todayLabel") as HTMLDivElement;
const todayInput = document.getElementById("todayInput") as HTMLInputElement;
const commitBtn = document.getElementById("commitBtn") as HTMLButtonElement;
const committedNotice = document.getElementById("committedNotice") as HTMLDivElement;
const historyContainer = document.getElementById("historyContainer") as HTMLDivElement;

todayLabel.textContent = today;

const loadEntries = async (): Promise<void> => {
    try {
        const result = await window.storage.list("entry:");

        if (result && result.keys) {
            const loadedEntries = await Promise.all(

                result.keys.map(async (key) => {
                    try {
                        const data = await window.storage.get(key);
                        return data ? (JSON.parse(data.value) as Entry) : null;
                    } catch {
                        return null;
                    }
                })
            );

            entries = loadedEntries
                .filter((e): e is Entry => e !== null)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const todayEntry = entries.find((e) => e.date === today);
            if (todayEntry) {
                todayInput.style.display = "none";
                todayInput.disabled = true;
                commitBtn.disabled = true;
                todayCommitted = true;
                committedNotice.style.display = "block";
                committedNotice.textContent = `Committed at ${new Date(todayEntry.timestamp).toLocaleTimeString()}`;
            } else {
                todayInput.focus();
            }

            renderHistory();
        }
    } catch (error) {
        console.error("Failed to load entries:", error);
        todayInput.focus();
    }
}

const autoExpand = (element: HTMLDivElement): void => {
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
}

const handleCommit = async (): Promise<void> => {
    if (!todayInput.value.trim() || todayCommitted) return;

    const entry: Entry = {
        date: today,
        text: todayInput.value,
        timestamp: new Date().toISOString(),
    };

    try {
        await window.storage.set(`entry:${today}`, JSON.stringify(entry));

        todayInput.style.display = "none";
        todayInput.disabled = true;
        commitBtn.disabled = true;
        todayCommitted = true;
        committedNotice.style.display = "block";
        committedNotice.textContent = `Committed at ${new Date(entry.timestamp).toLocaleTimeString()}`;

        entries.unshift(entry);
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        renderHistory();
    } catch (error) {
        console.error("Failed to commit entry:", error);
        alert("Failed to commit. Please try again.");
    }
}

const renderHistory = (): void => {
    const historyEntries = entries.filter(e => e.date !== today);

    let html = "";

    const todayEntry = entries.find(e => e.date === today);
    if (todayEntry) {
        html += `
          <div class="history-entry today">
            <div class="history-date">${todayEntry.date} (today)</div>
            <div class="history-text">${escapeHtml(todayEntry.text)}</div>
            <div class="history-timestamp">Committed ${new Date(todayEntry.timestamp).toLocaleString()}</div>
          </div>
        `;
    }

    if (historyEntries.length === 0) {
        html += '<div class="history-empty">no previous entries</div>';
    } else {
        html += historyEntries.map(entry => `
            <div class="history-entry">
              <div class="history-date">${entry.date}</div>
              <div class="history-text">${escapeHtml(entry.text)}</div>
              <div class="history-timestamp">Committed ${new Date(entry.timestamp).toLocaleString()}</div>
            </div>
        `).join('');
    }

    historyContainer.innerHTML = html;
}

const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Export renderHistory globally
(window as any).renderHistory = renderHistory;

commitBtn.addEventListener("click", handleCommit);

todayInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleCommit();
    }
});

todayInput.addEventListener("input", () => { autoExpand(todayInput); });

loadEntries();

// Import dev-functions after all functions are defined
import './dev-functions';