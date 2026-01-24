import { BrowserWindow, app } from "electron";
import path from "node:path";
import fs from "node:fs";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

export const loadWindowContent = (window: BrowserWindow): void => {
    // Dev mode
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        try {
            window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
            console.log('Loaded dev server URL');
            return;
        } catch (error) {
            console.error('Failed to load dev server:', error);
        }
    }

    // Production mode
    const appPath = app.getAppPath();
    const dirname = __dirname;
    const viteName = MAIN_WINDOW_VITE_NAME;

    const pathsToTry = [
        // Direct path
        path.join(dirname, viteName, 'index.html'),
        path.join(dirname, '..', viteName, 'index.html'),
        
        // renderer folder
        path.join(dirname, '../renderer', viteName, 'index.html'),
        
        // app path
        path.join(appPath, viteName, 'index.html'),
        
        // .vite/renderer
        path.join(dirname, '..', '.vite', 'renderer', viteName, 'index.html'),
        
        // app path + .vite
        path.join(appPath, '.vite', 'renderer', viteName, 'index.html'),
        
        // main_window โดยตรง
        path.join(dirname, '..', 'main_window', 'index.html'),
        
        // renderer/main_window
        path.join(dirname, '../renderer/main_window', 'index.html'),
    ];

    console.log('__dirname:', dirname);
    console.log('app.getAppPath():', appPath);
    console.log('MAIN_WINDOW_VITE_NAME:', viteName);
    console.log('');

    for (let i = 0; i < pathsToTry.length; i++) {
        const tryPath = pathsToTry[i];
        const exists = fs.existsSync(tryPath);
        
        console.log(`[${i + 1}/${pathsToTry.length}] ${exists ? '✓' : '✗'} ${tryPath}`);
        
        if (exists) {
            try {
                window.loadFile(tryPath);
                console.log(`\nSUCCESS! Loaded from: ${tryPath}`);
                return;
            } catch (error) {
                console.error(`File exists but failed to load:`, error);
            }
        }
    }

    // If we reach here, all attempts failed
    console.error('\nFAILED: Could not find index.html in any expected location!');
    console.error('Available files in __dirname:');
    
    try {
        const files = fs.readdirSync(dirname);
        files.forEach(file => console.log(`  - ${file}`));
    } catch (error) {
        console.error('Could not read directory:', error);
    }

    // Error page
    window.loadURL('data:text/html,<h1>Error: Could not load app</h1><p>Check console for details</p>');
};