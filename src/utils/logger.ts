/**
 * @file   Structured logger for the main process.
 * @author Peakk2011
 */

import { app } from 'electron';

/**
 * Log levels enumeration (as const for literal types)
 */
export const LogLevel = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    DEBUG: 'DEBUG',
} as const;

export type LogLevel = typeof LogLevel[keyof typeof LogLevel];

/**
 * Create formatted log message
 * @param   level   Log level
 * @param   message Log message
 * @returns         Formatted log string
 */
const formatLogMessage = (level: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    return `Runtime Consider [${timestamp}] [${level}] ${message}`;
};

/**
 * Logger interface for strong typing
 */
export interface Logger {
    /**
     * Log info level message
     * @param   message Log message
     * @param   data    Additional data
     */
    info: (message: string, data?: Record<string, unknown>) => void;

    /**
     * Log warning level message
     * @param   message Log message
     * @param   data    Additional data
     */
    warn: (message: string, data?: Record<string, unknown>) => void;

    /**
     * Log error level message
     * @param   message Log message
     * @param   error   Error object or additional data
     */
    error: (message: string, error?: Error | unknown) => void;

    /**
     * Log debug level message (only in development mode)
     * @param   message Log message
     * @param   data    Additional data
     */
    debug: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Main process logger
 */
export const logger: Logger = {
    info: (message, data = {}) => {
        const logMessage = formatLogMessage(LogLevel.INFO, message);
        if (Object.keys(data).length > 0) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    },

    warn: (message, data = {}) => {
        const logMessage = formatLogMessage(LogLevel.WARN, message);
        if (Object.keys(data).length > 0) {
            console.warn(logMessage, data);
        } else {
            console.warn(logMessage);
        }
    },

    error: (message, error) => {
        const logMessage = formatLogMessage(LogLevel.ERROR, message);
        if (error) {
            console.error(logMessage, error);
        } else {
            console.error(logMessage);
        }
    },

    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
            const logMessage = formatLogMessage(LogLevel.DEBUG, message);
            if (Object.keys(data).length > 0) {
                console.debug(logMessage, data);
            } else {
                console.debug(logMessage);
            }
        }
    },
};