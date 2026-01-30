import { ipcMain } from "electron";
import { getStorage } from "@core/storage/storageManager";
import { validateEntry , validateAppConfig } from "@core/storage/schema";
import { logger } from "@utils/logger";
import * as path from "path";
import { promises as fsPromises } from "fs";

/**
 * Register all IPC handlers for main process
 * These handle communication from renderer process
 */
export const registerIPCHandlers = (): void => {
    const storage = getStorage();

    // Storage Handlers

    /**
     * Get today's date
     */
    ipcMain.handle("storage:getToday", () => {
        const today = new Date().toISOString().split("T")[0];
        logger.info("Getting today", { date: today });
        return today;
    });

    /**
     * Get today's entry
     */
    ipcMain.handle("storage:getTodayEntry", async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const entry = await storage.loadEntry(today);
            if (entry) {
                validateEntry(entry); // Validate schema
                logger.info("Today entry retrieved", { date: today });
                return entry;
            }
            return null;
        } catch (error) {
            logger.error("Failed to get today entry", error);
            throw error;
        }
    });

    /**
     * Get all entries
     */
    ipcMain.handle("storage:getAllEntries", async () => {
        try {
            const entries = await storage.loadAllEntries();
            logger.info("All entries retrieved", { count: entries.length });
            return entries;
        } catch (error) {
            logger.error("Failed to get all entries", error);
            throw error;
        }
    });

    /**
     * Get specific entry by date
     */
    ipcMain.handle("storage:getEntry", async (_event, date: string) => {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error(`Invalid date format: ${date}`);
            }
            const entry = await storage.loadEntry(date);
            if (entry) {
                validateEntry(entry);
                logger.info("Entry retrieved", { date });
                return entry;
            }
            return null;
        } catch (error) {
            logger.error(`Failed to get entry for date ${date}`, error);
            throw error;
        }
    });

    /**
     * Save entry for today
     * Once saved, cannot be modified (immutability)
     */
    ipcMain.handle("storage:saveEntry", async (_event, date: string, text: string) => {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error(`Invalid date format: ${date}`);
            }

            if (!text || text.trim().length === 0) {
                throw new Error("Entry text cannot be empty");
            }

            // Check if entry already exists (immutability check)
            const existing = await storage.loadEntry(date);
            if (existing) {
                throw new Error(`Entry for ${date} already exists and cannot be modified`);
            }

            const entry = {
                date,
                text: text.trim(),
                timestamp: new Date().toISOString(),
                committed: true,
            };

            validateEntry(entry); // Validate before saving
            await storage.saveEntry(date, entry);
            logger.info("Entry saved", { date });
        } catch (error) {
            logger.error(`Failed to save entry for date ${date}`, error);
            throw error;
        }
    });

    /**
     * Delete entry (with backup)
     * Only for emergency/correction purposes
     */
    ipcMain.handle("storage:deleteEntry", async (_event, date: string) => {
        try {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                throw new Error(`Invalid date format: ${date}`);
            }
            await storage.deleteEntry(date);
            logger.warn("Entry deleted", { date });
        } catch (error) {
            logger.error(`Failed to delete entry for date ${date}`, error);
            throw error;
        }
    });

    /**
     * Export all data
     */
    ipcMain.handle("storage:exportData", async (_event, exportPath: string) => {
        try {
            if (!exportPath || !path.isAbsolute(exportPath)) {
                throw new Error("Invalid export path");
            }
            
            const dir = path.dirname(exportPath);
            
            try {
                await fsPromises.access(dir);
            } catch (err) {
                throw new Error("Export directory does not exist or is not accessible");
            }

            await storage.exportData(exportPath);
            logger.info("Data exported", { path: exportPath });
        } catch (error) {
            logger.error("Failed to export data", error);
            throw error;
        }
    });

    /**
     * Create backup
     */
    ipcMain.handle("storage:createBackup", async () => {
        try {
            const backupPath = await storage.createBackup();
            logger.info("Backup created from IPC");
            return backupPath;
        } catch (error) {
            logger.error("Failed to create backup", error);
            throw error;
        }
    });

    // Config Handlers

    /**
     * Get app config
     */
    ipcMain.handle("config:getConfig", async () => {
        try {
            const config = await storage.loadConfig();
            if (config) {
                validateAppConfig(config);
                logger.info("Config retrieved");
                return config;
            }
            return null;
        } catch (error) {
            logger.error("Failed to get config", error);
            throw error;
        }
    });

    /**
     * Save app config
     */
    ipcMain.handle("config:saveConfig", async (_event, config: unknown) => {
        try {
            validateAppConfig(config);
            await storage.saveConfig(config);
            logger.info("Config saved");
        } catch (error) {
            logger.error("Failed to save config", error);
            throw error;
        }
    });

    // Logger Handlers

    ipcMain.on("logger:info", (_event, { message, data }) => {
        logger.info(message, data);
    });

    ipcMain.on("logger:warn", (_event, { message, data }) => {
        logger.warn(message, data);
    });

    ipcMain.on("logger:error", (_event, { message, error }) => {
        logger.error(message, error);
    });

    logger.info("IPC handlers registered");
};
