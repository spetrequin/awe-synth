/**
 * Configuration Loader - Enhanced with Validation
 * Part of AWE Player EMU8000 Emulator
 *
 * DEPRECATED: This file is maintained for backward compatibility.
 * New code should use utils/enhanced-config-loader.ts directly.
 */
export { configLoader, preloadCommonConfigs, enhancedConfigLoader, ConfigLoadError, ConfigValidationError, ConfigSchemaError } from './utils/enhanced-config-loader.js';
export interface ConfigCache {
    [key: string]: unknown;
}
//# sourceMappingURL=config-loader.d.ts.map