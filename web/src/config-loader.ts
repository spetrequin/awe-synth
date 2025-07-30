/**
 * Configuration Loader - Loads JSON configs at runtime
 * Part of AWE Player EMU8000 Emulator
 */

export interface ConfigCache {
    [key: string]: unknown;
}

class ConfigurationLoader {
    private cache: ConfigCache = {};
    private baseUrl = './src/configs/';
    
    /**
     * Load a JSON configuration file
     */
    public async loadConfig<T>(configName: string): Promise<T> {
        // Check cache first
        if (this.cache[configName]) {
            return this.cache[configName] as T;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}${configName}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${configName} (${response.status})`);
            }
            
            const config = await response.json();
            
            // Cache the result
            this.cache[configName] = config;
            
            return config as T;
        } catch (error) {
            console.error(`Error loading config ${configName}:`, error);
            throw error;
        }
    }
    
    /**
     * Preload multiple configurations
     */
    public async preloadConfigs(configNames: string[]): Promise<void> {
        const promises = configNames.map(name => this.loadConfig(name));
        await Promise.all(promises);
    }
    
    /**
     * Clear configuration cache
     */
    public clearCache(): void {
        this.cache = {};
    }
    
    /**
     * Get cached config (returns null if not cached)
     */
    public getCachedConfig<T>(configName: string): T | null {
        return this.cache[configName] as T || null;
    }
    
    /**
     * Check if config is cached
     */
    public isCached(configName: string): boolean {
        return configName in this.cache;
    }
}

// Export singleton instance
export const configLoader = new ConfigurationLoader();

// Preload common configurations
export const preloadCommonConfigs = async (): Promise<void> => {
    await configLoader.preloadConfigs([
        'gm-instruments',
        'gm-drums', 
        'gm-drum-kits',
        'midi-cc-controls'
    ]);
};