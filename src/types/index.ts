/**
 * Core type definitions for Runtime Consider
 */

/**
 * Entry - Immutable daily record
 */
export interface Entry {
    date: string;           // YYYY-MM-DD
    text: string;           // The daily record
    timestamp: string;      // ISO 8601 timestamp
    committed: boolean;     // Always true for stored entries
}

/**
 * Display Entry - Entry with formatted fields
 */
export interface DisplayEntry extends Entry {
    dateFormatted: string;
    timeFormatted: string;
}

/**
 * Day in timeline
 */
export interface TimelineDay {
    date: string;
    dateFormatted: string;
    hasEntry: boolean;
    entry?: DisplayEntry;
    isToday: boolean;
    isEmpty: boolean;
}

/**
 * Application state
 */
export interface AppState {
    today: string;
    todayEntry: Entry | null;
    allEntries: string[]; // List of entry dates
    isCommitted: boolean;
    committedAt?: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
    theme: "light" | "dark" | "system";
    timeFormat: "12h" | "24h";
    autoBackup: boolean;
    backupInterval: number;
    version: string;
}

/**
 * Operation result with success/error
 */
export interface OperationResult<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * Storage metrics
 */
export interface StorageMetrics {
    totalEntries: number;
    storageUsedBytes: number;
    oldestEntryDate?: string;
    newestEntryDate?: string;
    averageEntryLength: number;
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
    timestamp: string;
    version: string;
    entryCount: number;
    backupPath: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
    level: "debug" | "info" | "warn" | "error";
    enableConsole: boolean;
    enableFile: boolean;
    maxFileSize?: number;
    maxFiles?: number;
}

/**
 * IPC message structure
 */
export interface IPCMessage<T = unknown> {
    channel: string;
    data: T;
    timestamp: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
}
