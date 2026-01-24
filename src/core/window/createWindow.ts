import { createBrowserWindow } from "./hwnd/browserWindow";
import { loadWindowContent } from "./hwnd/windowLoader";
// eslint-disable-next-line import/no-unresolved
import { logger } from '@utils/logger';

export const createWindow = (): void => {
    const windowCreationStartTime = process.hrtime.bigint();

    const mainWindow = createBrowserWindow();
    loadWindowContent(mainWindow);
    // mainWindow.webContents.openDevTools();

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
};