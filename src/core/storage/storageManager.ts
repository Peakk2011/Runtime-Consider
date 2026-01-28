import { app } from "electron";
import * as path from "path";
import * as fs from "fs";
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
        try {
            const filePath = this.getEntryPath(date);
            const jsonData = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, jsonData, "utf-8");
            logger.info("Entry saved", { date, path: filePath });
        } catch (error) {
            logger.error(`Failed to save entry for date ${date}`, error);
            throw error;
        }
    }

    /**
     * Load an entry from disk
     */
    public async loadEntry(date: string): Promise<unknown> {
        try {
            const filePath = this.getEntryPath(date);
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const data = fs.readFileSync(filePath, "utf-8");
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
            if (!fs.existsSync(this.entriesDir)) {
                return [];
            }
            const files = fs.readdirSync(this.entriesDir);
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
        try {
            const filePath = this.getEntryPath(date);
            if (!fs.existsSync(filePath)) {
                return;
            }

            // Create backup before deletion
            const backupPath = this.getBackupPath(date);
            fs.copyFileSync(filePath, backupPath);

            fs.unlinkSync(filePath);
            logger.warn("Entry deleted", { date, backupPath });
        } catch (error) {
            logger.error(`Failed to delete entry for date ${date}`, error);
            throw error;
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

            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), "utf-8");
            logger.info("Data exported", { path: exportPath, entryCount: entries.length });
        } catch (error) {
            logger.error("Failed to export data", error);
            throw error;
        }
    }

    /**
     * Create automatic backup
     */
    public async createBackup(): Promise<string> {
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

            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), "utf-8");
            logger.info("Backup created", { path: backupPath });

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
            fs.writeFileSync(configPath, jsonData, "utf-8");
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
            if (!fs.existsSync(configPath)) {
                return null;
            }
            const data = fs.readFileSync(configPath, "utf-8");
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
     * Get storage directory info
     */
    public getStorageInfo(): { baseDir: string; entriesDir: string; backupsDir: string } {
        return {
            baseDir: this.baseDir,
            entriesDir: this.entriesDir,
            backupsDir: this.backupsDir,
        };
    }
}

/**
 * Get singleton instance
 */
export const getStorage = (): StorageManager => {
    return StorageManager.getInstance();
};
