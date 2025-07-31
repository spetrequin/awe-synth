/**
 * UI Styling Utilities
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides standardized CSS injection patterns and style management
 * to eliminate duplicate styling code across components.
 */
/**
 * Inject CSS styles into document head (prevents duplicates)
 */
export declare function injectStyles(styleId: string, css: string): void;
/**
 * Remove CSS styles from document
 */
export declare function removeStyles(styleId: string): void;
/**
 * Update existing CSS styles
 */
export declare function updateStyles(styleId: string, css: string): void;
/**
 * Get base component styles (common patterns)
 */
export declare function getBaseComponentStyles(): string;
/**
 * Get button styles
 */
export declare function getButtonStyles(): string;
/**
 * Get form element styles
 */
export declare function getFormStyles(): string;
/**
 * Get mode selector styles
 */
export declare function getModeStyles(): string;
/**
 * Get tab interface styles
 */
export declare function getTabStyles(): string;
/**
 * Get all standard UI styles combined
 */
export declare function getAllUIStyles(): string;
/**
 * Generate styles for specific component
 */
export declare function generateComponentStyles(componentName: string, customStyles?: string): string;
/**
 * Generate grid styles with custom columns
 */
export declare function generateGridStyles(selector: string, minColumnWidth?: string, gap?: string): string;
/**
 * Generate responsive breakpoint styles
 */
export declare function generateResponsiveStyles(selector: string, desktopStyles: string, tabletStyles?: string, mobileStyles?: string): string;
/**
 * Get utility CSS classes
 */
export declare function getUtilityStyles(): string;
export declare const STYLE_PRESETS: {
    readonly darkTheme: {
        readonly background: "#2a2a2a";
        readonly surface: "#333";
        readonly primary: "#05a";
        readonly secondary: "#555";
        readonly text: "white";
        readonly textSecondary: "#ccc";
        readonly border: "#444";
        readonly hover: "#444";
    };
    readonly lightTheme: {
        readonly background: "#f5f5f5";
        readonly surface: "white";
        readonly primary: "#007acc";
        readonly secondary: "#e0e0e0";
        readonly text: "#333";
        readonly textSecondary: "#666";
        readonly border: "#ddd";
        readonly hover: "#f0f0f0";
    };
};
/**
 * Apply theme to component styles
 */
export declare function applyTheme(styles: string, theme: typeof STYLE_PRESETS.darkTheme): string;
//# sourceMappingURL=ui-styles.d.ts.map