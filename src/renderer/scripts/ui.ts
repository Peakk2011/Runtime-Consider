// UI rendering and DOM manipulation

import { initializeMagneticEffect } from './anim';
import type { Entry } from './types';
import { todayDateString } from './constants';
import { translationStrings } from './i18n';
import { getPreviousEntries, getTodayEntry } from './storage';

let historyObserver: IntersectionObserver | null = null;
let historyRenderedCount = 0;
let cachedPreviousEntries: Entry[] = [];

const timestampCache = new Map<string, string>();

const DEFAULT_HISTORY_INITIAL = 12;
const DEFAULT_HISTORY_BATCH = 20;

export const escapeHtmlContent = (textContent: string): string => {
    const temporaryDiv = document.createElement("div");
    temporaryDiv.textContent = textContent;
    return temporaryDiv.innerHTML;
};

export const autoExpandTextarea = (textareaElement: HTMLTextAreaElement): void => {
    textareaElement.style.height = "auto";
    const newHeight = Math.min(textareaElement.scrollHeight, 400);
    textareaElement.style.height = `${newHeight}px`;
};

const checkHistoryContainerListeners = (container: HTMLDivElement): void => {
    if (container.dataset.bound === "1") return;
    container.dataset.bound = "1";

    container.addEventListener('contextmenu', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.history-entry')) {
            event.preventDefault();
        }
    });

    container.addEventListener('dblclick', (event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.history-entry')) {
            event.preventDefault();
        }
    });
};

const cleanHistoryObserver = (): void => {
    if (historyObserver) {
        historyObserver.disconnect();
        historyObserver = null;
    }
};

const getCachedTimestamp = (isoString: string): string => {
    if (!isoString) {
        return "";
    }

    const cached = timestampCache.get(isoString);
    if (cached !== undefined) return cached;
    
    const formatted = new Date(isoString).toLocaleString();
    const safe = formatted === "Invalid Date" ? "" : formatted;
    
    timestampCache.set(isoString, safe);
    return safe;
};

const buildHistoryEntriesHtml = (
    entries: Entry[],
    committedPrefix: string,
    immutableBadgeText: string
): string => {
    return entries.map(entry => {
        const entryTimestamp = escapeHtmlContent(getCachedTimestamp(entry.timestamp));

        return `
            <div class="history-entry committed-entry">
                <div class="history-date">${entry.date}</div>
                <div class="history-text">${escapeHtmlContent(entry.text)}</div>
                <div class="history-timestamp">${committedPrefix} ${entryTimestamp}</div>
                <div class="immutable-badge">${immutableBadgeText}</div>
            </div>
        `;
    }).join('');
};

const appendNextHistoryBatch = (
    container: HTMLDivElement,
    committedPrefix: string,
    immutableBadgeText: string,
    batchSize: number
): void => {
    const nextBatch = cachedPreviousEntries.slice(
        historyRenderedCount,
        historyRenderedCount + batchSize
    );
    
    if (nextBatch.length === 0) {
        const sentinel = container.querySelector('#historySentinel');
        sentinel?.remove();
        cleanHistoryObserver();
        return;
    }

    container.insertAdjacentHTML("beforeend", buildHistoryEntriesHtml(
        nextBatch,
        committedPrefix,
        immutableBadgeText
    ));
    
    historyRenderedCount += nextBatch.length;

    if (historyRenderedCount >= cachedPreviousEntries.length) {
        const sentinel = container.querySelector('#historySentinel');
        sentinel?.remove();
        cleanHistoryObserver();
    }

    const hasHistory = container.querySelector('.history-entry') !== null;

    if (hasHistory) {
        requestAnimationFrame(() => {
            initializeMagneticEffect();
        });
    }
};

export const renderHistoryView = (
    options?: { initialLimit?: number; batchSize?: number; skipEffects?: boolean }
): void => {
    const historyEntriesContainer = document.getElementById("historyContainer") as HTMLDivElement;
    
    if (!historyEntriesContainer) {
        console.warn("History container not found");
        return;
    }
    
    const previousEntries = getPreviousEntries();
    const initialLimit = options?.initialLimit ?? DEFAULT_HISTORY_INITIAL;
    const batchSize = options?.batchSize ?? DEFAULT_HISTORY_BATCH;
    const skipEffects = options?.skipEffects ?? false;

    let historyHTML = "";

    const todayEntry = getTodayEntry();

    if (todayEntry) {
        const todaySuffix = translationStrings?.todaySuffix
            ? ` ${escapeHtmlContent(translationStrings.todaySuffix)}`
            : " (today)";

        const committedPrefix = escapeHtmlContent(
            translationStrings?.committedNoticePrefix || "Committed"
        );

        const committedTimestamp = escapeHtmlContent(getCachedTimestamp(todayEntry.timestamp));

        historyHTML += `
            <div class="history-entry today committed-entry" data-is-new="true">
                <div class="history-date">${todayEntry.date}${todaySuffix}</div>
                <div class="history-text">${escapeHtmlContent(todayEntry.text)}</div>
                <div class="history-timestamp">${committedPrefix} ${committedTimestamp}</div>
            </div>
        `;
    }

    if (previousEntries.length === 0) {
        const emptyMessage = escapeHtmlContent(
            translationStrings?.noPreviousEntriesText || "no previous entries"
        );
        historyHTML += `<div class="history-empty">${emptyMessage}</div>`;
    } else {
        const committedPrefix = escapeHtmlContent(
            translationStrings?.committedNoticePrefix || "Committed"
        );
        const immutableBadgeText = escapeHtmlContent(
            translationStrings?.immutableBadge || ""
        );
        const initialBatch = previousEntries.slice(0, initialLimit);
        historyRenderedCount = initialBatch.length;
        cachedPreviousEntries = previousEntries;

        historyHTML += buildHistoryEntriesHtml(initialBatch, committedPrefix, immutableBadgeText);

        if (historyRenderedCount < previousEntries.length) {
            historyHTML += `<div id="historySentinel"></div>`;
        }
    }

    cleanHistoryObserver();
    historyEntriesContainer.innerHTML = historyHTML;

    checkHistoryContainerListeners(historyEntriesContainer);

    const sentinel = historyEntriesContainer.querySelector('#historySentinel');
    
    if (sentinel && cachedPreviousEntries.length > historyRenderedCount) {
        const committedPrefix = escapeHtmlContent(
            translationStrings?.committedNoticePrefix || "Committed"
        );
        const immutableBadgeText = escapeHtmlContent(
            translationStrings?.immutableBadge || ""
        );
        historyObserver = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                appendNextHistoryBatch(
                    historyEntriesContainer,
                    committedPrefix,
                    immutableBadgeText,
                    batchSize
                );
            }
        }, { rootMargin: "200px" });
        historyObserver.observe(sentinel);
    }

    if (!skipEffects) {
        const hasHistory = historyEntriesContainer.querySelector('.history-entry') !== null;
        
        if (hasHistory) {
            requestAnimationFrame(() => {
                initializeMagneticEffect();
            });
        }
    }
};

export const updateTodayUI = (entry: Entry): void => {
    const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement;
    const commitButton = document.getElementById("commitBtn") as HTMLButtonElement;
    const committedStatusNotice = document.getElementById("committedNotice") as HTMLDivElement;
    if (!todayTextInput || !commitButton || !committedStatusNotice) {
        console.warn("Today UI elements not found");
        return;
    }

    todayTextInput.value = entry.text;
    todayTextInput.disabled = true;
    todayTextInput.readOnly = true;
    todayTextInput.style.cursor = 'not-allowed';
    todayTextInput.style.opacity = '0';
    todayTextInput.style.display = 'none';
    
    commitButton.disabled = true;
    commitButton.style.display = "none";
    
    committedStatusNotice.style.display = "block";

    const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed at';
    const committedTimeRaw = new Date(entry.timestamp).toLocaleTimeString();
    const committedTime = committedTimeRaw === "Invalid Date" ? "" : committedTimeRaw;
    
    committedStatusNotice.textContent = committedTime
        ? `${committedPrefix} ${committedTime}`
        : committedPrefix;
};

export const applyThemePreference = (themePreference: string | undefined): void => {
    if (!themePreference || themePreference === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else if (themePreference === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (themePreference === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
};
