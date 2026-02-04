import { app, BrowserWindow, session } from "electron";
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
            const cspPolicy = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                "connect-src 'self' ws://localhost:* http://localhost:*",
                "object-src 'none'",
                "base-uri 'none'",
                "frame-ancestors 'none'",
            ].join("; ");

            session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                const responseHeaders = {
                    ...details.responseHeaders,
                    "Content-Security-Policy": [cspPolicy],
                };
                callback({ responseHeaders });
            });

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
