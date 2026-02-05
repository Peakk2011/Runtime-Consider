// Storage and entry management

import type { Entry } from './types';
import { todayDateString } from './constants';

export let allEntries: Entry[] = [];

export const loadAllEntries = async (): Promise<Entry[]> => {
    try {
        const entryFileNames = await window.electron.storage.getAllEntries();
        const entryDates = entryFileNames
            .map((fileName) => fileName.replace(".json", ""))
            .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));

        const loadedEntryPromises = entryDates.map(async (dateString) => {
            try {
                const entryData = await window.electron.storage.getEntry(dateString);
                if (!entryData) return null;
                const entry = entryData as Entry;
                if (
                    typeof entry.date !== "string" ||
                    typeof entry.text !== "string" ||
                    typeof entry.timestamp !== "string"
                ) {
                    return null;
                }
                return entry;
            } catch {
                return null;
            }
        });

        const loadedEntries = await Promise.all(loadedEntryPromises);

        allEntries = loadedEntries
            .filter((entry): entry is Entry => entry !== null)
            .sort((entryA, entryB) => {
                const timeA = new Date(entryA.date).getTime();
                const timeB = new Date(entryB.date).getTime();
                return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });

        return allEntries;

    } catch (error) {
        console.error("Failed to load entries:", error);
        return [];
    }
};

export const getTodayEntry = (): Entry | undefined => {
    return allEntries.find((entry) => entry.date === todayDateString);
};

export const getPreviousEntries = (): Entry[] => {
    return allEntries.filter(entry => entry.date !== todayDateString);
};

export const saveEntry = async (entry: Entry): Promise<void> => {
    await window.electron.storage.saveEntry(entry.date, entry.text);
    
    allEntries.unshift(entry);
    allEntries.sort((entryA, entryB) => {
        return new Date(entryB.date).getTime() - new Date(entryA.date).getTime();
    });
};
