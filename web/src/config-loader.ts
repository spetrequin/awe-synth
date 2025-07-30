/**
 * Configuration Loader - Enhanced with Validation
 * Part of AWE Player EMU8000 Emulator
 * 
 * DEPRECATED: This file is maintained for backward compatibility.
 * New code should use utils/enhanced-config-loader.ts directly.
 */

// Re-export enhanced configuration loader with backward compatibility
export {
    configLoader,
    preloadCommonConfigs,
    enhancedConfigLoader,
    ConfigLoadError,
    ConfigValidationError,
    ConfigSchemaError
} from './utils/enhanced-config-loader.js';

// Legacy interface for backward compatibility
export interface ConfigCache {
    [key: string]: unknown;
}

// Note: The new enhanced config loader provides:
// - Runtime validation with schemas
// - Better error handling and reporting
// - Configuration metadata and versioning
// - Timeout handling
// - Detailed cache statistics
// - Support for configuration reloading