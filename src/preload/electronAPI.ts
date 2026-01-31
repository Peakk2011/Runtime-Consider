import { ipcRenderer, contextBridge } from "electron";

/**
 * Type definitions for IPC communication
 */
export interface StorageAPI {
    getToday(): Promise<string>;
    getTodayEntry(): Promise<{ date: string; text: string; timestamp: string } | null>;
    getAllEntries(): Promise<string[]>;
    getEntry(date: string): Promise<{ date: string; text: string; timestamp: string } | null>;
    saveEntry(date: string, text: string): Promise<void>;
    deleteEntry(date: string): Promise<void>;
    exportData(exportPath: string): Promise<void>;
    createBackup(): Promise<string>;
}

export interface ConfigAPI {
    getConfig(): Promise<Record<string, unknown>>;
    saveConfig(config: Record<string, unknown>): Promise<void>;
}

export interface LoggerAPI {
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, error?: Record<string, unknown>): void;
}

export interface AppAPI {
    exit(): void;
}

export interface ElectronAPI {
    storage: StorageAPI;
    config: ConfigAPI;
    logger: LoggerAPI;
    app: AppAPI;
}

/**
 * Storage API - Exposed via contextBridge
 */
const storageAPI: StorageAPI = {
    getToday: () => ipcRenderer.invoke("storage:getToday"),
    getTodayEntry: () => ipcRenderer.invoke("storage:getTodayEntry"),
    getAllEntries: () => ipcRenderer.invoke("storage:getAllEntries"),
    getEntry: (date: string) => ipcRenderer.invoke("storage:getEntry", date),
    saveEntry: (date: string, text: string) => ipcRenderer.invoke("storage:saveEntry", date, text),
    deleteEntry: (date: string) => ipcRenderer.invoke("storage:deleteEntry", date),
    exportData: (exportPath: string) => ipcRenderer.invoke("storage:exportData", exportPath),
    createBackup: () => ipcRenderer.invoke("storage:createBackup"),
};

/**
 * Config API - Exposed via contextBridge
 */
const configAPI: ConfigAPI = {
    getConfig: () => ipcRenderer.invoke("config:getConfig"),
    saveConfig: (config: Record<string, unknown>) =>
        ipcRenderer.invoke("config:saveConfig", config),
};

/**
 * Logger API - Exposed via contextBridge
 */
const loggerAPI: LoggerAPI = {
    info: (message: string, data?: Record<string, unknown>) => {
        ipcRenderer.send("logger:info", { message, data });
    },
    warn: (message: string, data?: Record<string, unknown>) => {
        ipcRenderer.send("logger:warn", { message, data });
    },
    error: (message: string, error?: Record<string, unknown>) => {
        ipcRenderer.send("logger:error", { message, error });
    },
};

/**
 * App API - Exposed via contextBridge
 */
const appAPI: AppAPI = {
    exit: () => {
        ipcRenderer.send("app:exit");
    },
};

/**
 * Expose safe APIs to renderer process via contextBridge
 */
contextBridge.exposeInMainWorld("electron", {
    storage: storageAPI,
    config: configAPI,
    logger: loggerAPI,
    app: appAPI,
} as ElectronAPI);

/**
 * Type augmentation for window object
 */
declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
