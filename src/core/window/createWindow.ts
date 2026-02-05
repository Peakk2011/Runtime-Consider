import { BrowserWindow } from "electron";
import { createBrowserWindow } from "./hwnd/browserWindow";
import { loadWindowContent } from "./hwnd/windowLoader";
// eslint-disable-next-line import/no-unresolved
import { logger } from '@utils/logger';

export const createWindow = (): BrowserWindow => {
    const windowCreationStartTime = process.hrtime.bigint();

    const mainWindow = createBrowserWindow();
    loadWindowContent(mainWindow);
    // mainWindow.webContents.openDevTools();

    const isAllowedNavigation = (targetUrl: string): boolean => {
        try {
            const currentUrl = mainWindow.webContents.getURL();
            if (!currentUrl) {
                return true;
            }
            const current = new URL(currentUrl);
            const next = new URL(targetUrl);

            if (next.protocol === "data:") {
                return true;
            }

            return current.origin === next.origin;
        } catch {
            return false;
        }
    };

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (isAllowedNavigation(url)) {
            return { action: "allow" };
        }
        logger.warn("Blocked window open", { url });
        return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
        if (!isAllowedNavigation(url)) {
            event.preventDefault();
            logger.warn("Blocked navigation", { url });
        }
    });

    if (process.env.NODE_ENV !== "production") {
        mainWindow.on('show', () => {
            const elapsedTime = Number(process.hrtime.bigint() - windowCreationStartTime) / 1_000_000; 
            logger.info(`Window shown in ${elapsedTime.toFixed(2)} ms`);
        });

        mainWindow.webContents.on('did-finish-load', () => {
            const elapsedTime = Number(process.hrtime.bigint() - windowCreationStartTime) / 1_000_000; 
            logger.info(`Window content (excluding DOM) loaded in ${elapsedTime.toFixed(2)} ms`);
        });
        
        mainWindow.webContents.on('dom-ready', () => {
            const elapsedTime = Number(process.hrtime.bigint() - windowCreationStartTime) / 1_000_000; 
            logger.info(`Window DOM ready in ${elapsedTime.toFixed(2)} ms`);
        });
    }

    return mainWindow;
};
