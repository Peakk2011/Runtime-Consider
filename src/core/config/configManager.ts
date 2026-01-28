import { logger } from "@utils/logger";
import { AppConfigSchema, AppConfig } from "@core/storage/schema";

/**
 * Configuration manager for Runtime Consider
 * Handles default config, persistence, and validation
 */
export class ConfigManager {
    private config: AppConfig;
    private defaults: AppConfig = {
        theme: "system",
        timeFormat: "24h",
        autoBackup: true,
        backupInterval: 7,
        version: "1.0.0",
    };

    constructor(initialConfig?: AppConfig) {
        this.config = initialConfig ?? this.defaults;
    }

    /**
     * Get current config
     */
    public getConfig(): AppConfig {
        return { ...this.config };
    }

    /**
     * Set entire config
     */
    public setConfig(config: Partial<AppConfig>): void {
        try {
            const updated = { ...this.config, ...config };
            const validated = AppConfigSchema.parse(updated);
            this.config = validated;
            logger.info("Config updated", validated);
        } catch (error) {
            logger.error("Invalid config", error);
            throw error;
        }
    }

    /**
     * Get specific config value
     */
    public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.config[key];
    }

    /**
     * Set specific config value
     */
    public set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
        this.config[key] = value;
        logger.info(`Config set: ${String(key)}`, { value });
    }

    /**
     * Get default config
     */
    public getDefaults(): AppConfig {
        return { ...this.defaults };
    }

    /**
     * Reset to defaults
     */
    public reset(): void {
        this.config = { ...this.defaults };
        logger.warn("Config reset to defaults");
    }

    /**
     * Export config as JSON
     */
    public export(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import config from JSON
     */
    public import(jsonStr: string): void {
        try {
            const parsed = JSON.parse(jsonStr);
            const validated = AppConfigSchema.parse(parsed);
            this.config = validated;
            logger.info("Config imported");
        } catch (error) {
            logger.error("Failed to import config", error);
            throw error;
        }
    }
}

/**
 * Singleton instance
 */
let configManager: ConfigManager | null = null;

/**
 * Get or create config manager
 */
export const getConfigManager = (initialConfig?: AppConfig): ConfigManager => {
    if (!configManager) {
        configManager = new ConfigManager(initialConfig);
    }
    return configManager;
};

/**
 * Reset config manager (for testing)
 */
export const resetConfigManager = (): void => {
    configManager = null;
};
