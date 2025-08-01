/**
 * Enhanced Configuration Loader with Validation
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides comprehensive configuration loading with runtime validation,
 * caching, error handling, and schema enforcement.
 */
import { DEBUG_LOGGERS } from './debug-logger.js';
import { ConfigValidationError, getConfigSchema, CONFIG_SCHEMAS } from './config-validator.js';
// Re-export validation error classes for backward compatibility
export { ConfigValidationError, ConfigSchemaError } from './config-validator.js';
// ===== ENHANCED CONFIGURATION LOADER =====
class EnhancedConfigurationLoader {
    cache = new Map();
    loadingPromises = new Map();
    baseUrl = './src/configs/';
    defaultTimeout = 10000; // 10 seconds
    /**
     * Load and validate a configuration file
     */
    async loadConfig(configName, options = {}) {
        const { skipValidation = false, forceReload = false, timeout = this.defaultTimeout } = options;
        // Return cached config if available and not forcing reload
        if (!forceReload && this.cache.has(configName)) {
            const cached = this.cache.get(configName);
            DEBUG_LOGGERS.configLoader.log(`Using cached config: ${configName}`);
            return cached;
        }
        // Return existing loading promise if already loading
        if (this.loadingPromises.has(configName)) {
            DEBUG_LOGGERS.configLoader.log(`Waiting for config load in progress: ${configName}`);
            const existingPromise = this.loadingPromises.get(configName);
            if (existingPromise) {
                return existingPromise;
            }
        }
        // Start new load
        const loadPromise = this.performLoad(configName, skipValidation, timeout);
        this.loadingPromises.set(configName, loadPromise);
        try {
            const result = await loadPromise;
            this.cache.set(configName, result);
            return result;
        }
        finally {
            this.loadingPromises.delete(configName);
        }
    }
    /**
     * Perform the actual config loading with timeout
     */
    async performLoad(configName, skipValidation, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            DEBUG_LOGGERS.configLoader.log(`Loading config: ${configName}`);
            const response = await fetch(`${this.baseUrl}${configName}.json`, {
                signal: controller.signal
            });
            if (!response.ok) {
                throw new ConfigLoadError(`Failed to load config: ${configName} (HTTP ${response.status})`, configName, response.status);
            }
            const rawData = await response.json();
            // Create metadata
            const metadata = {
                name: configName,
                version: '1.0', // Default version, can be overridden by schema
                loadedAt: new Date(),
                validated: !skipValidation,
                errors: []
            };
            let validatedData;
            if (skipValidation) {
                DEBUG_LOGGERS.configLoader.warn(`Skipping validation for config: ${configName}`);
                validatedData = rawData;
            }
            else {
                const validationResult = this.validateConfig(configName, rawData);
                if (!validationResult.success) {
                    metadata.errors = validationResult.errors;
                    // Log validation errors
                    validationResult.errors.forEach(error => {
                        DEBUG_LOGGERS.configLoader.error(`Validation error in ${configName}: ${error.message}`);
                    });
                    const firstError = validationResult.errors[0];
                    if (!firstError) {
                        throw new ConfigLoadError(`Config validation failed for ${configName}: Unknown validation error`, configName, 400);
                    }
                    throw new ConfigValidationError(`Config validation failed for ${configName}: ${firstError.message}`, configName, firstError.fieldPath, firstError.actualValue, firstError.expectedType);
                }
                validatedData = validationResult.data;
                // Update metadata with schema info
                const schema = getConfigSchema(configName);
                if (schema) {
                    metadata.version = schema.version;
                }
            }
            DEBUG_LOGGERS.configLoader.log(`Successfully loaded config: ${configName} (validated: ${metadata.validated})`);
            return {
                data: validatedData,
                metadata
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new ConfigLoadError(`Config load timeout: ${configName} (${timeout}ms)`, configName, 0, 'TIMEOUT');
            }
            if (error instanceof ConfigValidationError || error instanceof ConfigLoadError) {
                throw error;
            }
            throw new ConfigLoadError(`Failed to load config ${configName}: ${error}`, configName, 0, 'UNKNOWN', error instanceof Error ? error : undefined);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * Validate config data using registered schema
     */
    validateConfig(configName, data) {
        const schema = getConfigSchema(configName);
        if (!schema) {
            DEBUG_LOGGERS.configLoader.warn(`No validation schema found for config: ${configName}. Using type assertion.`);
            return {
                success: true,
                data: data,
                errors: []
            };
        }
        DEBUG_LOGGERS.configLoader.log(`Validating ${configName} with schema v${schema.version}`);
        return schema.validator(data, configName);
    }
    /**
     * Preload multiple configurations with validation
     */
    async preloadConfigs(configNames, options = {}) {
        DEBUG_LOGGERS.configLoader.log(`Preloading ${configNames.length} configs`);
        const results = new Map();
        const errors = [];
        const promises = configNames.map(async (name) => {
            try {
                const config = await this.loadConfig(name, options);
                results.set(name, config);
            }
            catch (error) {
                errors.push({ name, error: error });
                DEBUG_LOGGERS.configLoader.error(`Failed to preload config ${name}`, error);
            }
        });
        await Promise.allSettled(promises);
        if (errors.length > 0) {
            DEBUG_LOGGERS.configLoader.warn(`Preload completed with ${errors.length} errors out of ${configNames.length} configs`);
        }
        else {
            DEBUG_LOGGERS.configLoader.log(`Successfully preloaded all ${configNames.length} configs`);
        }
        return results;
    }
    /**
     * Get cached configuration without loading
     */
    getCachedConfig(configName) {
        return this.cache.get(configName) || null;
    }
    /**
     * Check if configuration is cached
     */
    isCached(configName) {
        return this.cache.has(configName);
    }
    /**
     * Clear cache for specific config or all configs
     */
    clearCache(configName) {
        if (configName) {
            this.cache.delete(configName);
            DEBUG_LOGGERS.configLoader.log(`Cleared cache for config: ${configName}`);
        }
        else {
            this.cache.clear();
            DEBUG_LOGGERS.configLoader.log('Cleared all config cache');
        }
    }
    /**
     * Reload configuration with fresh data
     */
    async reloadConfig(configName, options = {}) {
        return this.loadConfig(configName, { ...options, forceReload: true });
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const configs = Array.from(this.cache.entries());
        return {
            totalConfigs: configs.length,
            validatedConfigs: configs.filter(([, config]) => config.metadata.validated).length,
            configNames: configs.map(([name]) => name),
            loadedAt: Object.fromEntries(configs.map(([name, config]) => [name, config.metadata.loadedAt]))
        };
    }
    /**
     * List available schemas
     */
    getAvailableSchemas() {
        return Array.from(CONFIG_SCHEMAS.entries()).map(([name, schema]) => {
            const result = {
                name,
                version: schema.version
            };
            if (schema.description !== undefined) {
                result.description = schema.description;
            }
            return result;
        });
    }
}
// ===== ERROR CLASSES =====
export class ConfigLoadError extends Error {
    configName;
    httpStatus;
    code;
    originalError;
    constructor(message, configName, httpStatus, code = 'UNKNOWN', originalError) {
        super(message);
        this.configName = configName;
        this.httpStatus = httpStatus;
        this.code = code;
        this.originalError = originalError;
        this.name = 'ConfigLoadError';
    }
}
// ===== EXPORTS =====
// Export singleton instance
export const enhancedConfigLoader = new EnhancedConfigurationLoader();
// Legacy compatibility export
export const configLoader = {
    async loadConfig(configName) {
        const result = await enhancedConfigLoader.loadConfig(configName);
        return result.data;
    },
    async preloadConfigs(configNames) {
        await enhancedConfigLoader.preloadConfigs(configNames);
    },
    clearCache: () => enhancedConfigLoader.clearCache(),
    getCachedConfig(configName) {
        const cached = enhancedConfigLoader.getCachedConfig(configName);
        return cached?.data || null;
    },
    isCached: (configName) => enhancedConfigLoader.isCached(configName)
};
// Preload common configurations with validation
export const preloadCommonConfigs = async () => {
    await enhancedConfigLoader.preloadConfigs([
        'gm-instruments',
        'gm-drums',
        'gm-drum-kits',
        'midi-cc-controls'
    ]);
};
//# sourceMappingURL=enhanced-config-loader.js.map