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

        // Load existing entries
        const existingEntries = await storage.loadAllEntries();
        const entryDates = existingEntries.map((file) => file.replace(".json", ""));

        // Initialize entry state manager
        const stateManager = getEntryStateManager();
        await stateManager.loadCommittedEntries(entryDates);

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

        // Register IPC handlers
        registerIPCHandlers();

        logger.info("Core services initialized");
    } catch (error) {
        logger.error("Failed to initialize core services", error);
        throw error;
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
