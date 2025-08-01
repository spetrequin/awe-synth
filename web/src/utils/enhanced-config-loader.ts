/**
 * Enhanced Configuration Loader with Validation
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides comprehensive configuration loading with runtime validation,
 * caching, error handling, and schema enforcement.
 */

import { DEBUG_LOGGERS } from './debug-logger.js';
import { 
    ConfigValidationError, 
    ConfigSchemaError,
    ValidationResult,
    getConfigSchema,
    CONFIG_SCHEMAS
} from './config-validator.js';

// ===== ENHANCED CONFIG INTERFACES =====

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

// ===== ENHANCED CONFIGURATION LOADER =====

class EnhancedConfigurationLoader {
    private cache = new Map<string, ValidatedConfig<any>>();
    private loadingPromises = new Map<string, Promise<ValidatedConfig<any>>>();
    private baseUrl = './src/configs/';
    private defaultTimeout = 10000; // 10 seconds

    /**
     * Load and validate a configuration file
     */
    public async loadConfig<T>(
        configName: string, 
        options: ConfigLoadOptions = {}
    ): Promise<ValidatedConfig<T>> {
        const {
            skipValidation = false,
            forceReload = false,
            timeout = this.defaultTimeout
        } = options;

        // Return cached config if available and not forcing reload
        if (!forceReload && this.cache.has(configName)) {
            const cached = this.cache.get(configName)!;
            DEBUG_LOGGERS.configLoader.log(`Using cached config: ${configName}`);
            return cached as ValidatedConfig<T>;
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(configName)) {
            DEBUG_LOGGERS.configLoader.log(`Waiting for config load in progress: ${configName}`);
            const existingPromise = this.loadingPromises.get(configName);
            if (existingPromise) {
                return existingPromise as Promise<ValidatedConfig<T>>;
            }
        }

        // Start new load
        const loadPromise = this.performLoad<T>(configName, skipValidation, timeout);
        this.loadingPromises.set(configName, loadPromise);

        try {
            const result = await loadPromise;
            this.cache.set(configName, result);
            return result;
        } finally {
            this.loadingPromises.delete(configName);
        }
    }

    /**
     * Perform the actual config loading with timeout
     */
    private async performLoad<T>(
        configName: string, 
        skipValidation: boolean,
        timeout: number
    ): Promise<ValidatedConfig<T>> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            DEBUG_LOGGERS.configLoader.log(`Loading config: ${configName}`);
            
            const response = await fetch(`${this.baseUrl}${configName}.json`, {
                signal: controller.signal
            });

            if (!response.ok) {
                throw new ConfigLoadError(
                    `Failed to load config: ${configName} (HTTP ${response.status})`,
                    configName,
                    response.status
                );
            }

            const rawData = await response.json();
            
            // Create metadata
            const metadata: ConfigMetadata = {
                name: configName,
                version: '1.0', // Default version, can be overridden by schema
                loadedAt: new Date(),
                validated: !skipValidation,
                errors: []
            };

            let validatedData: T;

            if (skipValidation) {
                DEBUG_LOGGERS.configLoader.warn(`Skipping validation for config: ${configName}`);
                validatedData = rawData as T;
            } else {
                const validationResult = this.validateConfig<T>(configName, rawData);
                
                if (!validationResult.success) {
                    metadata.errors = validationResult.errors;
                    
                    // Log validation errors
                    validationResult.errors.forEach(error => {
                        DEBUG_LOGGERS.configLoader.error(
                            `Validation error in ${configName}: ${error.message}`
                        );
                    });

                    const firstError = validationResult.errors[0];
                    if (!firstError) {
                        throw new ConfigLoadError(
                            `Config validation failed for ${configName}: Unknown validation error`,
                            configName,
                            400
                        );
                    }

                    throw new ConfigValidationError(
                        `Config validation failed for ${configName}: ${firstError.message}`,
                        configName,
                        firstError.fieldPath,
                        firstError.actualValue,
                        firstError.expectedType
                    );
                }
                
                validatedData = validationResult.data!;
                
                // Update metadata with schema info
                const schema = getConfigSchema(configName);
                if (schema) {
                    metadata.version = schema.version;
                }
            }

            DEBUG_LOGGERS.configLoader.log(
                `Successfully loaded config: ${configName} (validated: ${metadata.validated})`
            );

            return {
                data: validatedData,
                metadata
            };

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new ConfigLoadError(
                    `Config load timeout: ${configName} (${timeout}ms)`,
                    configName,
                    0,
                    'TIMEOUT'
                );
            }

            if (error instanceof ConfigValidationError || error instanceof ConfigLoadError) {
                throw error;
            }

            throw new ConfigLoadError(
                `Failed to load config ${configName}: ${error}`,
                configName,
                0,
                'UNKNOWN',
                error
            );
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Validate config data using registered schema
     */
    private validateConfig<T>(configName: string, data: unknown): ValidationResult<T> {
        const schema = getConfigSchema<T>(configName);
        
        if (!schema) {
            DEBUG_LOGGERS.configLoader.warn(
                `No validation schema found for config: ${configName}. Using type assertion.`
            );
            return {
                success: true,
                data: data as T,
                errors: []
            };
        }

        DEBUG_LOGGERS.configLoader.log(`Validating ${configName} with schema v${schema.version}`);
        return schema.validator(data, configName);
    }

    /**
     * Preload multiple configurations with validation
     */
    public async preloadConfigs(
        configNames: string[], 
        options: ConfigLoadOptions = {}
    ): Promise<Map<string, ValidatedConfig<any>>> {
        DEBUG_LOGGERS.configLoader.log(`Preloading ${configNames.length} configs`);
        
        const results = new Map<string, ValidatedConfig<any>>();
        const errors: Array<{ name: string; error: Error }> = [];

        const promises = configNames.map(async (name) => {
            try {
                const config = await this.loadConfig(name, options);
                results.set(name, config);
            } catch (error) {
                errors.push({ name, error: error as Error });
                DEBUG_LOGGERS.configLoader.error(`Failed to preload config ${name}`, error);
            }
        });

        await Promise.allSettled(promises);

        if (errors.length > 0) {
            DEBUG_LOGGERS.configLoader.warn(
                `Preload completed with ${errors.length} errors out of ${configNames.length} configs`
            );
        } else {
            DEBUG_LOGGERS.configLoader.log(`Successfully preloaded all ${configNames.length} configs`);
        }

        return results;
    }

    /**
     * Get cached configuration without loading
     */
    public getCachedConfig<T>(configName: string): ValidatedConfig<T> | null {
        return this.cache.get(configName) as ValidatedConfig<T> || null;
    }

    /**
     * Check if configuration is cached
     */
    public isCached(configName: string): boolean {
        return this.cache.has(configName);
    }

    /**
     * Clear cache for specific config or all configs
     */
    public clearCache(configName?: string): void {
        if (configName) {
            this.cache.delete(configName);
            DEBUG_LOGGERS.configLoader.log(`Cleared cache for config: ${configName}`);
        } else {
            this.cache.clear();
            DEBUG_LOGGERS.configLoader.log('Cleared all config cache');
        }
    }

    /**
     * Reload configuration with fresh data
     */
    public async reloadConfig<T>(
        configName: string, 
        options: ConfigLoadOptions = {}
    ): Promise<ValidatedConfig<T>> {
        return this.loadConfig<T>(configName, { ...options, forceReload: true });
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        totalConfigs: number;
        validatedConfigs: number;
        configNames: string[];
        loadedAt: { [configName: string]: Date };
    } {
        const configs = Array.from(this.cache.entries());
        
        return {
            totalConfigs: configs.length,
            validatedConfigs: configs.filter(([, config]) => config.metadata.validated).length,
            configNames: configs.map(([name]) => name),
            loadedAt: Object.fromEntries(
                configs.map(([name, config]) => [name, config.metadata.loadedAt])
            )
        };
    }

    /**
     * List available schemas
     */
    public getAvailableSchemas(): Array<{ name: string; version: string; description?: string }> {
        return Array.from(CONFIG_SCHEMAS.entries()).map(([name, schema]) => ({
            name,
            version: schema.version,
            description: schema.description
        }));
    }
}

// ===== ERROR CLASSES =====

export class ConfigLoadError extends Error {
    constructor(
        message: string,
        public readonly configName: string,
        public readonly httpStatus: number,
        public readonly code: 'TIMEOUT' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'UNKNOWN' = 'UNKNOWN',
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'ConfigLoadError';
    }
}

// ===== EXPORTS =====

// Export singleton instance
export const enhancedConfigLoader = new EnhancedConfigurationLoader();

// Legacy compatibility export
export const configLoader = {
    async loadConfig<T>(configName: string): Promise<T> {
        const result = await enhancedConfigLoader.loadConfig<T>(configName);
        return result.data;
    },
    
    async preloadConfigs(configNames: string[]): Promise<void> {
        await enhancedConfigLoader.preloadConfigs(configNames);
    },
    
    clearCache: () => enhancedConfigLoader.clearCache(),
    
    getCachedConfig<T>(configName: string): T | null {
        const cached = enhancedConfigLoader.getCachedConfig<T>(configName);
        return cached?.data || null;
    },
    
    isCached: (configName: string) => enhancedConfigLoader.isCached(configName)
};

// Preload common configurations with validation
export const preloadCommonConfigs = async (): Promise<void> => {
    await enhancedConfigLoader.preloadConfigs([
        'gm-instruments',
        'gm-drums', 
        'gm-drum-kits',
        'midi-cc-controls'
    ]);
};