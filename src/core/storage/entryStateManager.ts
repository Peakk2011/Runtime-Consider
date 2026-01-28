import { logger } from "@utils/logger";

/**
 * State management for immutability enforcement
 * Ensures entries cannot be modified after commit
 */
export class EntryStateManager {
    private committedEntries: Map<string, boolean> = new Map();
    private entryLocks: Map<string, Date> = new Map();

    /**
     * Mark an entry as committed (immutable)
     */
    public commitEntry(date: string, timestamp: Date = new Date()): void {
        this.committedEntries.set(date, true);
        this.entryLocks.set(date, timestamp);
        logger.info("Entry committed and locked", { date });
    }

    /**
     * Check if entry is committed and immutable
     */
    public isCommitted(date: string): boolean {
        return this.committedEntries.get(date) ?? false;
    }

    /**
     * Get commit timestamp
     */
    public getCommitTime(date: string): Date | undefined {
        return this.entryLocks.get(date);
    }

    /**
     * Attempt to modify a committed entry - throws error
     */
    public assertCanModify(date: string): void {
        if (this.isCommitted(date)) {
            const commitTime = this.getCommitTime(date);
            throw new Error(
                `Entry for ${date} is committed and immutable. ` +
                    `Committed at: ${commitTime?.toISOString()}`
            );
        }
    }

    /**
     * Get all committed entries
     */
    public getCommittedEntries(): string[] {
        return Array.from(this.committedEntries.entries())
            .filter(([_, committed]) => committed)
            .map(([date, _]) => date);
    }

    /**
     * Load committed entries from storage
     */
    public async loadCommittedEntries(entryDates: string[]): Promise<void> {
        for (const date of entryDates) {
            this.commitEntry(date);
        }
        logger.info("Committed entries loaded", { count: entryDates.length });
    }

    /**
     * Reset state (careful - only for app initialization)
     */
    public reset(): void {
        this.committedEntries.clear();
        this.entryLocks.clear();
        logger.warn("Entry state manager reset");
    }
}

/**
 * Singleton instance
 */
let stateManager: EntryStateManager | null = null;

/**
 * Get or create state manager
 */
export const getEntryStateManager = (): EntryStateManager => {
    if (!stateManager) {
        stateManager = new EntryStateManager();
    }
    return stateManager;
};
