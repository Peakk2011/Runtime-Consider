import { logger } from "@utils/logger";

/**
 * Custom error types for Runtime Consider
 */
export class RuntimeConsiderError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = "RuntimeConsiderError";
    }
}

export class StorageError extends RuntimeConsiderError {
    constructor(message: string) {
        super(message, "STORAGE_ERROR");
        this.name = "StorageError";
    }
}

export class ValidationError extends RuntimeConsiderError {
    constructor(message: string) {
        super(message, "VALIDATION_ERROR");
        this.name = "ValidationError";
    }
}

export class ImmutabilityError extends RuntimeConsiderError {
    constructor(message: string) {
        super(message, "IMMUTABILITY_ERROR");
        this.name = "ImmutabilityError";
    }
}

export class DataCorruptionError extends RuntimeConsiderError {
    constructor(message: string) {
        super(message, "DATA_CORRUPTION");
        this.name = "DataCorruptionError";
    }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
    /**
     * Attempt to recover from storage error
     */
    static async recoverFromStorageError(error: Error): Promise<boolean> {
        try {
            logger.warn("Attempting storage error recovery", { error: error.message });

            // Could implement automatic backup restoration here
            // For now, just log and return false
            return false;
        } catch (e) {
            logger.error("Recovery failed", e);
            return false;
        }
    }

    /**
     * Validate data integrity
     */
    static async validateDataIntegrity(data: unknown): Promise<boolean> {
        try {
            if (!data || typeof data !== "object") {
                throw new ValidationError("Data is not an object");
            }

            const obj = data as Record<string, unknown>;

            // Check required properties based on type
            if ("date" in obj && "text" in obj && "timestamp" in obj) {
                // Looks like entry data
                return this.validateEntry(obj);
            }

            return true;
        } catch (error) {
            logger.error("Data integrity check failed", error);
            return false;
        }
    }

    /**
     * Validate entry structure
     */
    private static validateEntry(obj: Record<string, unknown>): boolean {
        const { date, text, timestamp } = obj;

        // Date format check (YYYY-MM-DD)
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError(`Invalid date format: ${date}`);
        }

        // Text check
        if (typeof text !== "string" || text.trim().length === 0) {
            throw new ValidationError("Entry text is empty");
        }

        // Timestamp check (ISO string)
        if (typeof timestamp !== "string" || isNaN(new Date(timestamp).getTime())) {
            throw new ValidationError(`Invalid timestamp: ${timestamp}`);
        }

        return true;
    }

    /**
     * Handle corrupted entry recovery
     */
    static async recoverCorruptedEntry(
        date: string,
        backupPath: string
    ): Promise<{ success: boolean; recovered?: unknown }> {
        try {
            logger.warn("Attempting to recover corrupted entry", { date, backupPath });

            // In a real implementation, this would:
            // 1. Read the backup file
            // 2. Validate the backup data
            // 3. Restore it if valid

            return { success: false }; // Placeholder
        } catch (error) {
            logger.error(`Failed to recover entry for ${date}`, error);
            return { success: false };
        }
    }
}

/**
 * Error boundary wrapper for async operations
 */
export const withErrorBoundary = async <T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<{ success: boolean; data?: T; error?: Error }> => {
    try {
        logger.info(`Starting operation: ${operationName}`);
        const data = await operation();
        logger.info(`Operation succeeded: ${operationName}`);
        return { success: true, data };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Operation failed: ${operationName}`, err);
        return { success: false, error: err };
    }
};

/**
 * Retry logic for failed operations
 */
export const withRetry = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info(`${operationName} - Attempt ${attempt}/${maxRetries}`);
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            logger.warn(`${operationName} - Attempt ${attempt} failed`, { error: lastError.message });

            if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
            }
        }
    }

    throw new RuntimeConsiderError(
        `${operationName} failed after ${maxRetries} retries: ${lastError?.message}`,
        "MAX_RETRIES_EXCEEDED"
    );
};
