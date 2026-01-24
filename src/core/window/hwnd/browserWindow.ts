import { BrowserWindow } from "electron";
import { getWindowOptions } from "./windowOptions";

export const createBrowserWindow = (): BrowserWindow => {
    return new BrowserWindow(getWindowOptions());
};