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
    exportData(suggestedFileName?: string): Promise<void>;
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
    getOS(): Promise<string>;
}

export interface ElectronAPI {
    storage: StorageAPI;
    config: ConfigAPI;
    logger: LoggerAPI;
    app: AppAPI;
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

const isDateString = (value: unknown): value is string =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const deepFreeze = <T>(value: T): T => {
    if (value && typeof value === "object") {
        Object.freeze(value);

        for (const key of Object.getOwnPropertyNames(value)) {
            const prop = (value as Record<string, unknown>)[key];

            if (prop && typeof prop === "object" && !Object.isFrozen(prop)) {
                deepFreeze(prop);
            }
        }
    }
    return value;
};

/**
 * Storage API - Exposed via contextBridge
 */
const storageAPI: StorageAPI = {
    getToday: () => ipcRenderer.invoke("storage:getToday"),
    getTodayEntry: () => ipcRenderer.invoke("storage:getTodayEntry"),
    getAllEntries: () => ipcRenderer.invoke("storage:getAllEntries"),

    getEntry: (date: string) => {
        if (!isDateString(date)) {
            return Promise.reject(new Error("Invalid date format"));
        }
        return ipcRenderer.invoke("storage:getEntry", date);
    },

    saveEntry: (date: string, text: string) => {
        if (!isDateString(date)) {
            return Promise.reject(new Error("Invalid date format"));
        }
        if (!isNonEmptyString(text)) {
            return Promise.reject(new Error("Entry text cannot be empty"));
        }
        return ipcRenderer.invoke("storage:saveEntry", date, text);
    },

    deleteEntry: (date: string) => {
        if (!isDateString(date)) {
            return Promise.reject(new Error("Invalid date format"));
        }
        return ipcRenderer.invoke("storage:deleteEntry", date);
    },

    exportData: (suggestedFileName?: string) => {
        if (suggestedFileName !== undefined && !isNonEmptyString(suggestedFileName)) {
            return Promise.reject(new Error("Invalid export file name"));
        }
        return ipcRenderer.invoke("storage:exportData", suggestedFileName);
    },

    createBackup: () => ipcRenderer.invoke("storage:createBackup"),
};

/**
 * Config API - Exposed via contextBridge
 */
const configAPI: ConfigAPI = {
    getConfig: () => ipcRenderer.invoke("config:getConfig"),

    saveConfig: (config: Record<string, unknown>) => {
        if (!config || typeof config !== "object") {
            return Promise.reject(new Error("Invalid config payload"));
        }
        return ipcRenderer.invoke("config:saveConfig", config);
    },
};

/**
 * Logger API - Exposed via contextBridge
 */
const loggerAPI: LoggerAPI = {
    info: (message: string, data?: Record<string, unknown>) => {
        if (!isNonEmptyString(message)) return;
        ipcRenderer.send("logger:info", { message, data });
    },

    warn: (message: string, data?: Record<string, unknown>) => {
        if (!isNonEmptyString(message)) return;
        ipcRenderer.send("logger:warn", { message, data });
    },
    
    error: (message: string, error?: Record<string, unknown>) => {
        if (!isNonEmptyString(message)) return;
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
    getOS: () => ipcRenderer.invoke("app:getOS"),
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

deepFreeze((window as Window & { electron: ElectronAPI }).electron);

/**
 * Type augmentation for window object
 */
declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
