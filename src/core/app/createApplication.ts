import { app, BrowserWindow } from "electron";
import started from "electron-squirrel-startup";
import { createWindow } from "../window/createWindow";

if (started) {
    process.exit();
}

export const createApplication = (): void => {
    app.whenReady().then(
        createWindow
    );

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            app.quit();
        }
    });

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
};