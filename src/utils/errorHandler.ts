// src/utils/error-handler.ts
import log from 'electron-log';
import { app, dialog } from 'electron';

interface ErrorContext {
    component?: string;
    userId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
}

export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public context?: ErrorContext,
        public recoverable = true
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export const handleError = async (
    error: Error | AppError,
    showDialog = true
): Promise<void> => {
    const isAppError = error instanceof AppError;
    
    // Log with context
    log.error('Application Error:', {
        name: error.name,
        message: error.message,
        code: isAppError ? error.code : 'UNKNOWN',
        context: isAppError ? error.context : {},
        stack: error.stack,
    });

    // Show user-friendly dialog
    if (showDialog && isAppError && !error.recoverable) {
        await dialog.showErrorBox(
            'Application Error',
            `${error.message}\n\nCode: ${error.code}`
        );
    }

    // Crash report (optional)
    // await sendCrashReport(error);
};

// Global handlers
export const createErrorHandler = (): void => {
    process.on('uncaughtException', (error) => {
        handleError(error, true);
        app.quit();
    });

    process.on('unhandledRejection', (reason) => {
        handleError(
            new AppError(
                String(reason),
                'UNHANDLED_REJECTION',
                undefined,
                false
            ),
            true
        );  
    });
};