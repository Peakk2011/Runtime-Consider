import { z } from "zod";

/**
 * Schema for Entry data structure
 * Validates each daily entry
 */
export const EntrySchema = z.object({
    date: z.string().date(),
    text: z.string().min(1, "Entry text cannot be empty"),
    timestamp: z.string().datetime(),
    committed: z.boolean().default(true),
});

export type Entry = z.infer<typeof EntrySchema>;

/**
 * Schema for storage manifest
 * Keeps track of all entries
 */
export const ManifestSchema = z.object({
    version: z.string(),
    entries: z.array(z.string()),
    lastUpdated: z.string().datetime(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * Schema for application configuration
 */
export const AppConfigSchema = z.object({
    language: z.string().default("en"),
    theme: z.enum(["light", "dark", "system"]).default("system"),
    timeFormat: z.enum(["12h", "24h"]).default("24h"),
    autoBackup: z.boolean().default(true),
    backupInterval: z.number().int().positive().default(7), // days
    version: z.string(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

/**
 * Validates and parses entry data
 */
export const validateEntry = (data: unknown): Entry => {
    return EntrySchema.parse(data);
};

/**
 * Validates and parses manifest data
 */
export const validateManifest = (data: unknown): Manifest => {
    return ManifestSchema.parse(data);
};

/**
 * Validates and parses app config
 */
export const validateAppConfig = (data: unknown): AppConfig => {
    return AppConfigSchema.parse(data);
};
