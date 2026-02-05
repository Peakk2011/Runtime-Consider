/**
 * Application initialization
 * This file bootstraps all core systems
 */

import { getStorage } from "@core/storage/storageManager";
import { getEntryStateManager } from "@core/storage/entryStateManager";
import { getConfigManager } from "@core/config/configManager";
import { registerIPCHandlers } from "@core/ipc/registerHandlers";
import { logger } from "@utils/logger";
import { validateAppConfig } from "@core/storage/schema";

/**
 * Initialize core systems
 * Called from createApplication.ts after app.whenReady()
 */
export const initializeCoreServices = async (): Promise<void> => {
    try {
        // Initialize storage
        const storage = getStorage();

        // Load or initialize config
        let config = await storage.loadConfig();

        if (!config) {
            config = {
                theme: "system",
                timeFormat: "24h",
                autoBackup: true,
                backupInterval: 7,
                version: "1.1.0",
            };
            await storage.saveConfig(config);
        }

        // Validate config
        const validatedConfig = validateAppConfig(config);
        const configManager = getConfigManager(validatedConfig);

        // Register IPC handlers early so renderer can call immediately
        registerIPCHandlers();

        logger.info("Core services initialized");
    } catch (error) {
        logger.error("Failed to initialize core services", error);
        throw error;
    }
};

/**
 * Initialize deferred services after UI is shown
 */
export const initializeDeferredServices = async (): Promise<void> => {
    try {
        const storage = getStorage();
        
        const existingEntries = await storage.loadAllEntries();
        const entryDates = existingEntries.map((file) => file.replace(".json", ""));

        const stateManager = getEntryStateManager();
        await stateManager.loadCommittedEntries(entryDates);
        
        logger.info("Deferred services initialized");
    } catch (error) {
        logger.warn("Deferred services failed to initialize", {
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

/**
 * Cleanup services on app close
 */
export const cleanupCoreServices = async (): Promise<void> => {
    try {
        // Create final backup
        const storage = getStorage();
        await storage.createBackup();

        logger.info("Cleanup completed");
    } catch (error) {
        logger.error("Error during cleanup", error);
    }
};
