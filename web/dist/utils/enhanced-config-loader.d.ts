/**
 * Enhanced Configuration Loader with Validation
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides comprehensive configuration loading with runtime validation,
 * caching, error handling, and schema enforcement.
 */
import { ConfigValidationError } from './config-validator.js';
export { ConfigValidationError, ConfigSchemaError } from './config-validator.js';
export interface ConfigMetadata {
    name: string;
    version: string;
    loadedAt: Date;
    validated: boolean;
    errors: ConfigValidationError[];
}
export interface ValidatedConfig<T> {
    data: T;
    metadata: ConfigMetadata;
}
export interface ConfigLoadOptions {
    skipValidation?: boolean;
    forceReload?: boolean;
    timeout?: number;
}
declare class EnhancedConfigurationLoader {
    private cache;
    private loadingPromises;
    private baseUrl;
    private defaultTimeout;
    /**
     * Load and validate a configuration file
     */
    loadConfig<T>(configName: string, options?: ConfigLoadOptions): Promise<ValidatedConfig<T>>;
    /**
     * Perform the actual config loading with timeout
     */
    private performLoad;
    /**
     * Validate config data using registered schema
     */
    private validateConfig;
    /**
     * Preload multiple configurations with validation
     */
    preloadConfigs(configNames: string[], options?: ConfigLoadOptions): Promise<Map<string, ValidatedConfig<any>>>;
    /**
     * Get cached configuration without loading
     */
    getCachedConfig<T>(configName: string): ValidatedConfig<T> | null;
    /**
     * Check if configuration is cached
     */
    isCached(configName: string): boolean;
    /**
     * Clear cache for specific config or all configs
     */
    clearCache(configName?: string): void;
    /**
     * Reload configuration with fresh data
     */
    reloadConfig<T>(configName: string, options?: ConfigLoadOptions): Promise<ValidatedConfig<T>>;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        totalConfigs: number;
        validatedConfigs: number;
        configNames: string[];
        loadedAt: {
            [configName: string]: Date;
        };
    };
    /**
     * List available schemas
     */
    getAvailableSchemas(): Array<{
        name: string;
        version: string;
        description?: string;
    }>;
}
export declare class ConfigLoadError extends Error {
    readonly configName: string;
    readonly httpStatus: number;
    readonly code: 'TIMEOUT' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'UNKNOWN';
    readonly originalError?: Error | undefined;
    constructor(message: string, configName: string, httpStatus: number, code?: 'TIMEOUT' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'UNKNOWN', originalError?: Error | undefined);
}
export declare const enhancedConfigLoader: EnhancedConfigurationLoader;
export declare const configLoader: {
    loadConfig<T>(configName: string): Promise<T>;
    preloadConfigs(configNames: string[]): Promise<void>;
    clearCache: () => void;
    getCachedConfig<T>(configName: string): T | null;
    isCached: (configName: string) => boolean;
};
export declare const preloadCommonConfigs: () => Promise<void>;
//# sourceMappingURL=enhanced-config-loader.d.ts.map