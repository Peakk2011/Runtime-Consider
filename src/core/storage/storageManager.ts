import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import { logger } from "@utils/logger";

/**
 * StorageManager handles all persistent data operations
 * Uses the user's application data directory
 * 
 * Directory structure:
 * - userData/
 *   - entries/
 *     - 2024-01-15.json
 *     - 2024-01-16.json
 *   - manifest.json
 *   - config.json
 *   - backups/
 */
export class StorageManager {
    private static instance: StorageManager;
    private baseDir: string;
    private entriesDir: string;
    private backupsDir: string;

    private constructor() {
        // Use app.getPath("userData") for Electron to get user data directory
        this.baseDir = path.join(app.getPath("userData"), "runtime-consider");
        this.entriesDir = path.join(this.baseDir, "entries");
        this.backupsDir = path.join(this.baseDir, "backups");

        this.initializeDirectories();
    }

    /**
     * Get singleton instance of StorageManager
     */
    public static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    /**
     * Clear singleton instance - test helper only
     */
    public static clearInstanceForTests(): void {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore access test-only static
        StorageManager.instance = undefined as unknown as StorageManager;
    }

    /**
     * Initialize required directories
     */
    private initializeDirectories(): void {
        try {
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
                logger.info("Created storage directory", { dir: this.baseDir });
            }

            if (!fs.existsSync(this.entriesDir)) {
                fs.mkdirSync(this.entriesDir, { recursive: true });
                logger.info("Created entries directory", { dir: this.entriesDir });
            }

            if (!fs.existsSync(this.backupsDir)) {
                fs.mkdirSync(this.backupsDir, { recursive: true });
                logger.info("Created backups directory", { dir: this.backupsDir });
            }
        } catch (error) {
            logger.error("Failed to initialize storage directories", error);
            throw error;
        }
    }

    /**
     * Save an entry to disk
     */
    public async saveEntry(date: string, data: unknown): Promise<void> {
        const lock = await this.acquireLock(date);
        try {
            const filePath = this.getEntryPath(date);
            const jsonData = JSON.stringify(data, null, 2);
            await this.writeAtomic(filePath, jsonData);
            logger.info("Entry saved", { date, path: filePath });
        } catch (error) {
            logger.error(`Failed to save entry for date ${date}`, error);
            throw error;
        } finally {
            await this.releaseLock(lock).catch(() => {});
        }
    }

    /**
     * Load an entry from disk
     */
    public async loadEntry(date: string): Promise<unknown> {
        try {
            const filePath = this.getEntryPath(date);
            try {
                await fsPromises.access(filePath, fs.constants.R_OK);
            } catch {
                return null;
            }
            const data = await fsPromises.readFile(filePath, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            logger.error(`Failed to load entry for date ${date}`, error);
            throw error;
        }
    }

    /**
     * Get all entries
     */
    public async loadAllEntries(): Promise<string[]> {
        try {
            try {
                await fsPromises.access(this.entriesDir, fs.constants.R_OK);
            } catch {
                return [];
            }
            const files = await fsPromises.readdir(this.entriesDir);
            return files.filter((f) => f.endsWith(".json"));
        } catch (error) {
            logger.error("Failed to load all entries", error);
            throw error;
        }
    }

    /**
     * Delete an entry (creates backup first)
     * Note: This goes against immutability principle, use with caution
     */
    public async deleteEntry(date: string): Promise<void> {
        const lock = await this.acquireLock(date);
        try {
            const filePath = this.getEntryPath(date);
            try {
                await fsPromises.access(filePath, fs.constants.R_OK);
            } catch {
                return;
            }

            // Create backup before deletion
            const backupPath = this.getBackupPath(date);
            await fsPromises.copyFile(filePath, backupPath);

            await fsPromises.unlink(filePath);
            logger.warn("Entry deleted", { date, backupPath });
        } catch (error) {
            logger.error(`Failed to delete entry for date ${date}`, error);
            throw error;
        } finally {
            await this.releaseLock(lock).catch(() => {});
        }
    }

    /**
     * Export all entries as JSON
     */
    public async exportData(exportPath: string): Promise<void> {
        try {
            const entries = await this.loadAllEntries();
            const data: Record<string, unknown> = {};

            for (const filename of entries) {
                const date = filename.replace(".json", "");
                data[date] = await this.loadEntry(date);
            }

            const exportData = {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                entries: data,
            };

            await this.writeAtomic(exportPath, JSON.stringify(exportData, null, 2));
            logger.info("Data exported", { path: exportPath, entryCount: entries.length });
        } catch (error) {
            logger.error("Failed to export data", error);
            throw error;
        }
    }

    /**
     * Create automatic backup
     */
    public async createBackup(maxRetain: number = 10): Promise<string> {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const backupName = `backup-${timestamp}.json`;
            const backupPath = path.join(this.backupsDir, backupName);

            const entries = await this.loadAllEntries();
            const data: Record<string, unknown> = {};

            for (const filename of entries) {
                const date = filename.replace(".json", "");
                data[date] = await this.loadEntry(date);
            }

            const backupData = {
                version: "1.0",
                createdAt: new Date().toISOString(),
                entries: data,
            };

            await this.writeAtomic(backupPath, JSON.stringify(backupData, null, 2));
            logger.info("Backup created", { path: backupPath });

            // Prune old backups
            await this.pruneBackups(maxRetain);

            return backupPath;
        } catch (error) {
            logger.error("Failed to create backup", error);
            throw error;
        }
    }

    /**
     * Save app configuration
     */
    public async saveConfig(config: unknown): Promise<void> {
        try {
            const configPath = path.join(this.baseDir, "config.json");
            const jsonData = JSON.stringify(config, null, 2);
            await this.writeAtomic(configPath, jsonData);
            logger.info("Config saved", { path: configPath });
        } catch (error) {
            logger.error("Failed to save config", error);
            throw error;
        }
    }

    /**
     * Load app configuration
     */
    public async loadConfig(): Promise<unknown> {
        try {
            const configPath = path.join(this.baseDir, "config.json");
            try {
                await fsPromises.access(configPath, fs.constants.R_OK);
            } catch {
                return null;
            }
            const data = await fsPromises.readFile(configPath, "utf-8");
            return JSON.parse(data);
        } catch (error) {
            logger.error("Failed to load config", error);
            throw error;
        }
    }

    /**
     * Helper: Get full path for entry file
     */
    private getEntryPath(date: string): string {
        return path.join(this.entriesDir, `${date}.json`);
    }

    /**
     * Helper: Get backup path for entry
     */
    private getBackupPath(date: string): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        return path.join(this.backupsDir, `${date}-${timestamp}.json`);
    }

    /**
     * Write file atomically.
     */
    private async writeAtomic(targetPath: string, data: string): Promise<void> {
        const dir = path.dirname(targetPath);
        const base = path.basename(targetPath);
        const tmpName = `${base}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const tmpPath = path.join(dir, tmpName);

        await fsPromises.writeFile(tmpPath, data, "utf-8");
        await fsPromises.rename(tmpPath, targetPath);
    }

    /**
     * Lock file for an entry. Returns lockPath string.
     * If lock exists and is older than staleMs, it will be removed.
     */
    private async acquireLock(
        date: string,
        retries: number = 50,
        retryDelay = 100,
        staleMs: number = 1000 * 60 * 5
    ): Promise<string> {
        const lockPath = path.join(this.entriesDir, `${date}.lock`);

        for (let i = 0; i < retries; i++) {
            try {
                const fd = await fsPromises.open(lockPath, "wx");
                const info = { pid: process.pid, ts: new Date().toISOString() };
                await fd.writeFile(JSON.stringify(info));
                await fd.close();
                return lockPath;
            } catch (err: any) {
                // If exists, check age
                try {
                    const stat = await fsPromises.stat(lockPath);
                    const age = Date.now() - stat.mtimeMs;
                    if (age > staleMs) {
                        await fsPromises.unlink(lockPath);
                        continue;
                    }
                } catch { /* ignore */ }
                await new Promise((r) => setTimeout(r, retryDelay));
            }
        }
        throw new Error("Failed to acquire lock for " + date);
    }

    private async releaseLock(lockPath: string): Promise<void> {
        try {
            await fsPromises.unlink(lockPath);
        } catch (err) {
            // ignore
        }
    }

    /**
     * Old backups, keep `maxKeep` newest files
     */
    private async pruneBackups(maxKeep: number): Promise<void> {
        try {
            const files = await fsPromises.readdir(this.backupsDir);
            const backups = files.filter((f) => f.endsWith(".json"));
            if (backups.length <= maxKeep) return;

            const withTimes = await Promise.all(
                backups.map(async (f) => {
                    const p = path.join(this.backupsDir, f);
                    const stat = await fsPromises.stat(p);
                    return { file: p, mtime: stat.mtimeMs };
                })
            );

            withTimes.sort((a, b) => b.mtime - a.mtime); // newest first
            const toDelete = withTimes.slice(maxKeep);
            await Promise.all(toDelete.map((d) => fsPromises.unlink(d.file)));
            
            logger.info(
                "Pruned old backups",
                {
                    kept: maxKeep,
                    deleted: toDelete.length
                }
            );
        } catch (err) {
            // non-fatal
            logger.warn("Failed to prune backups", err);
        }
    }

    /**
     * Get storage directory info
     */
    public getStorageInfo(): { baseDir: string; entriesDir: string; backupsDir: string } {
        return {
            baseDir: this.baseDir,
            entriesDir: this.entriesDir,
            backupsDir: this.backupsDir,
        };
    }

    /**
     * DANGER อันตราย
     * 
     * Deletes all user data permanently. This is for development purposes only.
     * This will delete the entire storage directory.
     * The application should be restarted after this operation.
     */
    public async deleteAllData(): Promise<void> {
        if (process.env.NODE_ENV !== 'development') {
            logger.error("deleteAllData can only be called in development mode.");
            return;
        }

        // Close any open resources if necessary.
        // In this class, there aren't any persistent handles except for locks,
        // but those are transient.

        try {
            const { baseDir } = this.getStorageInfo();
            logger.warn(`Deleting all data in ${baseDir}`);
            await fsPromises.rm(baseDir, { recursive: true, force: true });
            logger.info("All data has been deleted.");

            // After deletion, we should re-initialize the directories
            // or instruct the user to restart the app.
            // Re-initializing seems appropriate.
            this.initializeDirectories();

            StorageManager.clearInstanceForTests();

        } catch (error) {
            logger.error("Failed to delete all data.", error);
            throw error;
        }
    }
}

/**
 * Get singleton instance
 */
export const getStorage = (): StorageManager => {
    return StorageManager.getInstance();
};
