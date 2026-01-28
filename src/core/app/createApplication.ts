import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { createWindow } from "../window/createWindow";
import { logger } from "@utils/logger";
import { initializeCoreServices, cleanupCoreServices } from "@core/bootstrap";

if (started) {
    process.exit();
}

export const createApplication = (): void => {
    app.whenReady().then(async () => {
        try {
            // Initialize all core services before creating window
            await initializeCoreServices();
            createWindow();
        } catch (error) {
            logger.error("Failed to initialize application", error);
            app.quit();
        }
    });

    app.on("window-all-closed", async () => {
        // Cleanup before closing
        await cleanupCoreServices();

        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
        logger.error("Uncaught exception", error);
    });
};