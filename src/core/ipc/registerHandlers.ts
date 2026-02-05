import { ipcMain, app, dialog } from "electron";
import { getStorage } from "@core/storage/storageManager";
import { validateEntry , validateAppConfig } from "@core/storage/schema";
import { logger } from "@utils/logger";
import * as path from "path";
import { promises as fsPromises } from "fs";
import { z } from "zod";

/**
 * Register all IPC handlers for main process
 * These handle communication from renderer process
 */
export const registerIPCHandlers = (): void => {
    const storage = getStorage();
    const loggerRateLimit = new Map<number, { count: number; windowStart: number }>();

    const LOG_WINDOW_MS = 10_000;
    const LOG_MAX_PER_WINDOW = 200;

    const stringSchema = z.string();
    const optionalStringSchema = z.string().optional();
    
    const logPayloadSchema = z.object({
        message: z.string().min(1).max(2000),
        data: z.record(z.string(), z.unknown()).optional(),
        error: z.unknown().optional(),
    });

    const configSchema = z.record(z.string(), z.unknown());

    const allowLog = (senderId: number): boolean => {
        const now = Date.now();
        const existing = loggerRateLimit.get(senderId);
        if (!existing || now - existing.windowStart > LOG_WINDOW_MS) {
            loggerRateLimit.set(senderId, { count: 1, windowStart: now });
            return true;
        }
        if (existing.count >= LOG_MAX_PER_WINDOW) return false;
        existing.count += 1;
        return true;
    };

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
            stringSchema.parse(date);

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
            stringSchema.parse(date);
            stringSchema.parse(text);
            
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
            stringSchema.parse(date);
            
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
    ipcMain.handle("storage:exportData", async (_event, suggestedFileName?: string) => {
        try {
            optionalStringSchema.parse(suggestedFileName);
            
            const safeName = suggestedFileName
                ? path.basename(suggestedFileName)
                : `runtime-consider-export-${new Date().toISOString().slice(0, 10)}.json`;

            const { canceled, filePath } = await dialog.showSaveDialog({
                title: "Export Runtime Consider Data",
                defaultPath: path.join(app.getPath("documents"), safeName),
                filters: [{ name: "JSON", extensions: ["json"] }],
            });

            if (canceled || !filePath) {
                logger.info("Export canceled");
                return;
            }

            const dir = path.dirname(filePath);
            await fsPromises.access(dir);

            await storage.exportData(filePath);
            logger.info("Data exported", { path: filePath });
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
            configSchema.parse(config);
            
            validateAppConfig(config);
            await storage.saveConfig(config);
            
            logger.info("Config saved");
        } catch (error) {
            logger.error("Failed to save config", error);
            throw error;
        }
    });

    // Logger Handlers

    ipcMain.on("logger:info", (event, payload) => {
        try {
            if (!allowLog(event.sender.id)) return;
            const { message, data } = logPayloadSchema.parse(payload) as { message: string; data?: Record<string, unknown> };
            logger.info(message, data);
        } catch {
            // ignore invalid logger
        }
    });

    ipcMain.on("logger:warn", (event, payload) => {
        try {
            if (!allowLog(event.sender.id)) return;
            const { message, data } = logPayloadSchema.parse(payload) as { message: string; data?: Record<string, unknown> };
            logger.warn(message, data);
        } catch {
            // ignore invalid logger
        }
    });

    ipcMain.on("logger:error", (event, payload) => {
        try {
            if (!allowLog(event.sender.id)) return;
            const { message, error } = logPayloadSchema.parse(payload) as { message: string; error?: any };
            logger.error(message, error);
        } catch {
            // ignore invalid logger
        }
    });

    // App Handlers

    ipcMain.on("app:exit", () => {
        logger.info("App exit requested from renderer");
        app.quit();
    });

    ipcMain.handle('app:getOS', () => {
        return process.platform;
    });

    logger.info("IPC handlers registered");
};
