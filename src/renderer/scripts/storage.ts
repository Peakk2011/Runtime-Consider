// Storage and entry management

import type { Entry } from './types';
import { todayDateString } from './constants';

export let allEntries: Entry[] = [];

export const loadAllEntries = async (): Promise<Entry[]> => {
    try {
        const entryFileNames = await window.electron.storage.getAllEntries();
        const entryDates = entryFileNames.map((fileName) => fileName.replace(".json", ""));

        const loadedEntryPromises = entryDates.map(async (dateString) => {
            try {
                const entryData = await window.electron.storage.getEntry(dateString);
                return entryData ? (entryData as Entry) : null;
            } catch {
                return null;
            }
        });

        const loadedEntries = await Promise.all(loadedEntryPromises);

        allEntries = loadedEntries
            .filter((entry): entry is Entry => entry !== null)
            .sort((entryA, entryB) => {
                return new Date(entryB.date).getTime() - new Date(entryA.date).getTime();
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
