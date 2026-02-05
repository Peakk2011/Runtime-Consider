import { app, BrowserWindow, session } from "electron";
import started from "electron-squirrel-startup";
import { createWindow } from "../window/createWindow";
import { logger } from "@utils/logger";
import { initializeCoreServices, initializeDeferredServices, cleanupCoreServices } from "@core/bootstrap";

let cspHookInstalled = false;

if (started) {
    process.exit();
}

export const createApplication = (): void => {
    app.whenReady().then(async () => {
        try {
            const isProd = app.isPackaged || process.env.NODE_ENV === "production";
            const connectSrc = isProd
                ? "connect-src 'self'"
                : "connect-src 'self' ws://localhost:* http://localhost:*";

            // We keep 'unsafe-inline' while UI relies on inline style mutations.
            const cspPolicy = [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                connectSrc,
                "object-src 'none'",
                "base-uri 'none'",
                "frame-ancestors 'none'",
            ].join("; ");

            if (!cspHookInstalled) {
                // Set CSP only once to avoid repeated hooks on hot reloads.
                session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                    const responseHeaders = {
                        ...details.responseHeaders,
                        "Content-Security-Policy": [cspPolicy],
                    };
                    callback({ responseHeaders });
                });
                
                cspHookInstalled = true;
            }

            // Initialize core services before creating window
            await initializeCoreServices();
            const mainWindow = createWindow();
            mainWindow.once("show", () => {
                setTimeout(() => {
                    initializeDeferredServices().catch(() => {});
                }, 0);
            });
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
