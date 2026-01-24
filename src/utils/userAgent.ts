import os from 'os';
import { versions } from 'process';
import type { BrowserWindow } from 'electron';

/**
 * LocalStorage usage information
 */
interface LocalStorageInfo {
    /** Used storage in MB */
    used: string;
    /** Total quota in MB */
    quota: string;
    /** Remaining storage in MB */
    remaining: string;
}

/**
 * Retrieves operating system information formatted for user agent string
 * @returns Formatted OS information
 */
const info = (): string => {
    const platform: NodeJS.Platform = os.platform();
    const arch: string = os.arch();
    const release: string = os.release();

    switch (platform) {
        case 'win32': {
            const [major, minor] = release.split('.');
            const archString: string = arch === 'x64' ? 'Win64; x64' : arch;
            return `Windows NT ${major}.${minor}; ${archString}`;
        }
        case 'darwin': {
            const [major, minor, patch = '0'] = release.split('.');
            return `Macintosh; Intel Mac OS X ${major}_${minor}_${patch}`;
        }
        case 'linux':
            return `X11; Linux ${arch}`;
        default:
            return `${platform}; ${arch}`;
    }
};

/**
 * Retrieves browser engine information (Chrome/Electron versions)
 * @returns Formatted engine information
 */
const getEngineInfo = (): string => {
    const chromeVersion: string = versions.chrome || '0.0.0.0';
    const electronVersion: string = versions.electron || '0.0.0';
    return `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Electron/${electronVersion}`;
};

/**
 * Retrieves localStorage usage information from the renderer process
 * @param win - Electron BrowserWindow instance
 * @returns Storage information or null if unavailable
 */
const getLocalStorageInfo = async (
    win: BrowserWindow | null | undefined
): Promise<LocalStorageInfo | null> => {
    if (!win?.webContents) {
        return null;
    }

    try {
        const storageInfo = await win.webContents.executeJavaScript(`
            (function() {
                try {
                    let totalBytes = 0;
                    
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const value = localStorage.getItem(key);
                        
                        if (key) totalBytes += key.length;
                        if (value) totalBytes += value.length;
                    }
                    
                    const QUOTA_BYTES = 5 * 1024 * 1024; // 5MB standard quota
                    const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
                    
                    return {
                        used: toMB(totalBytes),
                        quota: toMB(QUOTA_BYTES),
                        remaining: toMB(QUOTA_BYTES - totalBytes)
                    };
                } catch (error) {
                    console.error('Failed to calculate localStorage info:', error);
                    return null;
                }
            })()
        `) as LocalStorageInfo | null;

        return storageInfo;
    } catch (error: unknown) {
        console.error('Failed to execute localStorage script:', error);
        return null;
    }
};

/**
 * Generates a comprehensive user agent string with system and storage information
 * @param win - Electron BrowserWindow instance
 * @param appName - Application name
 * @param appVersion - Application version
 * @returns Complete user agent string
 * @example
 * ```typescript
 * const ua = await createUserAgent(mainWindow, 'Fascinate Notes', '2.0.0');
 * console.log(ua);
 * // Mozilla/5.0
 * // (Windows NT 10.0; Win64; x64)
 * // AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Electron/28.0.0
 * // Fascinate Notes/1.0.0
 * // LocalStorage: used=0.05MB; quota=5.00MB; remaining=4.95MB
 * ```
 */
export const createUserAgent = async (
    win: BrowserWindow | null | undefined,
    appName = 'Runtime Consider',
    appVersion = '1.0.0'
): Promise<string> => {
    const osInfo: string = info();
    const engineInfo: string = getEngineInfo();
    const localStorageInfo: LocalStorageInfo | null = await getLocalStorageInfo(win);

    const userAgentParts: string[] = [
        'Mozilla/5.0',
        `(${osInfo})`,
        engineInfo,
        `${appName}/${appVersion}`
    ];

    if (localStorageInfo) {
        userAgentParts.push(
            `LocalStorage: used=${localStorageInfo.used}MB; quota=${localStorageInfo.quota}MB; remaining=${localStorageInfo.remaining}MB`
        );
    }

    const userAgentString: string = userAgentParts.join('\n');
    
    return userAgentString;
};

export const userAgent = createUserAgent;