import { BrowserWindowConstructorOptions } from "electron";
import path from "node:path";
// eslint-disable-next-line import/no-unresolved
import { windowConfig } from "@window/windowConfig";

const preloadPath = path.join(__dirname, 'preload.js');

export const getWindowOptions = (): BrowserWindowConstructorOptions => ({
    width: windowConfig.size.width,
    height: windowConfig.size.height,

    minWidth: windowConfig.size.min?.width,
    minHeight: windowConfig.size.min?.height,

    maxWidth: windowConfig.size.max?.width,
    maxHeight: windowConfig.size.max?.height,

    resizable: windowConfig.resizable,
    fullscreen: windowConfig.fullscreen,

    title: windowConfig.title,
    
    ...(process.platform !== 'win32' ? {
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 18, y: 16 }
    } : {
        titleBarStyle: 'hidden',
    }),
    
    titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#000000',
        height: 36
    },

    webPreferences: {
        preload: preloadPath
    }
});