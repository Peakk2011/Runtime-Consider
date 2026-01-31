// UI rendering and DOM manipulation

import { initializeMagneticEffect } from './anim';
import type { Entry } from './types';
import { todayDateString } from './constants';
import { translationStrings } from './i18n';
import { getPreviousEntries, getTodayEntry } from './storage';

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

export const renderHistoryView = (): void => {
    const historyEntriesContainer = document.getElementById("historyContainer") as HTMLDivElement;
    const previousEntries = getPreviousEntries();

    let historyHTML = "";

    const todayEntry = getTodayEntry();

    if (todayEntry) {
        const todaySuffix = translationStrings?.todaySuffix 
            ? ` ${translationStrings.todaySuffix}` 
            : ' (today)';

        const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed';
        const committedTimestamp = new Date(todayEntry.timestamp).toLocaleString();

        historyHTML += `
            <div class="history-entry today committed-entry" data-is-new="true">
                <div class="history-date">${todayEntry.date}${todaySuffix}</div>
                <div class="history-text">${escapeHtmlContent(todayEntry.text)}</div>
                <div class="history-timestamp">${committedPrefix} ${committedTimestamp}</div>
            </div>
        `;
    }

    if (previousEntries.length === 0) {
        const emptyMessage = translationStrings?.noPreviousEntriesText || 'no previous entries';
        historyHTML += `<div class="history-empty">${emptyMessage}</div>`;
    } else {
        const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed';
        const immutableBadgeText = translationStrings?.immutableBadge || '';

        const previousEntriesHTML = previousEntries.map(entry => {
            const entryTimestamp = new Date(entry.timestamp).toLocaleString();

            return `
                <div class="history-entry committed-entry">
                    <div class="history-date">${entry.date}</div>
                    <div class="history-text">${escapeHtmlContent(entry.text)}</div>
                    <div class="history-timestamp">${committedPrefix} ${entryTimestamp}</div>
                    <div class="immutable-badge">${immutableBadgeText}</div>
                </div>
            `;
        }).join('');

        historyHTML += previousEntriesHTML;
    }

    historyEntriesContainer.innerHTML = historyHTML;

    const allHistoryEntries = historyEntriesContainer.querySelectorAll('.history-entry');

    allHistoryEntries.forEach((entryElement) => {
        entryElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            return false;
        });

        entryElement.addEventListener('dblclick', (event) => {
            event.preventDefault();
            return false;
        });
    });

    initializeMagneticEffect();
};

export const updateTodayUI = (entry: Entry): void => {
    const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement;
    const commitButton = document.getElementById("commitBtn") as HTMLButtonElement;
    const committedStatusNotice = document.getElementById("committedNotice") as HTMLDivElement;

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
    const committedTime = new Date(entry.timestamp).toLocaleTimeString();
    committedStatusNotice.textContent = `${committedPrefix} ${committedTime}`;
};

export const applyThemePreference = (themePreference: string | undefined): void => {
    if (!themePreference || themePreference === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else if (themePreference === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (themePreference === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    }
};
