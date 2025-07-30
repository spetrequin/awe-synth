/**
 * UI Styling Utilities
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides standardized CSS injection patterns and style management
 * to eliminate duplicate styling code across components.
 */

import { UI_CONSTANTS } from '../midi-constants.js';

// ===== STYLE MANAGEMENT =====

/**
 * Inject CSS styles into document head (prevents duplicates)
 */
export function injectStyles(styleId: string, css: string): void {
    // Check if styles already exist
    if (document.getElementById(styleId)) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Remove CSS styles from document
 */
export function removeStyles(styleId: string): void {
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
        existingStyle.remove();
    }
}

/**
 * Update existing CSS styles
 */
export function updateStyles(styleId: string, css: string): void {
    removeStyles(styleId);
    injectStyles(styleId, css);
}

// ===== STANDARD UI COMPONENT STYLES =====

/**
 * Get base component styles (common patterns)
 */
export function getBaseComponentStyles(): string {
    return `
        /* Base Component Styles */
        .ui-component {
            background: #2a2a2a;
            border-radius: 5px;
            padding: 15px;
            color: white;
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        .ui-section {
            margin-bottom: 20px;
            padding: 15px;
            background: #333;
            border-radius: 5px;
        }
        
        .ui-section-title {
            margin: 0 0 15px 0;
            color: #ccc;
            font-size: 16px;
            font-weight: bold;
        }
        
        .ui-field-container {
            display: flex;
            flex-direction: column;
            gap: 5px;
            margin-bottom: 15px;
        }
        
        .ui-field-label {
            font-weight: bold;
            color: #ccc;
            font-size: 14px;
        }
        
        .ui-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(${UI_CONSTANTS.GRID_MIN_COLUMN_WIDTH_STANDARD}px, 1fr));
            gap: 15px;
        }
    `;
}

/**
 * Get button styles
 */
export function getButtonStyles(): string {
    return `
        /* Button Styles */
        .ui-button {
            padding: 10px 20px;
            border: 2px solid #555;
            border-radius: 5px;
            background: #333;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            font-weight: bold;
        }
        
        .ui-button:hover {
            background: #444;
            border-color: #666;
        }
        
        .ui-button:active {
            transform: scale(0.95);
        }
        
        .ui-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .ui-button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .ui-preset-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(${UI_CONSTANTS.GRID_MIN_COLUMN_WIDTH_PRESETS}px, 1fr));
            gap: 10px;
        }
        
        .ui-preset-button {
            padding: 8px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background: #444;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 12px;
        }
        
        .ui-preset-button:hover {
            background: #555;
            border-color: #666;
        }
        
        .ui-reset-button {
            background: #c50;
            border-color: #d60;
        }
        
        .ui-reset-button:hover {
            background: #d60;
            border-color: #e70;
        }
    `;
}

/**
 * Get form element styles
 */
export function getFormStyles(): string {
    return `
        /* Form Element Styles */
        .ui-select {
            padding: 8px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background: #333;
            color: white;
            font-size: 14px;
            cursor: pointer;
        }
        
        .ui-select:focus {
            outline: none;
            border-color: #05a;
        }
        
        .ui-checkbox-container {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .ui-checkbox-container input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
        }
        
        .ui-slider-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .ui-slider {
            flex: 1;
            height: 6px;
            border-radius: 3px;
            background: #555;
            outline: none;
            -webkit-appearance: none;
        }
        
        .ui-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #05a;
            cursor: pointer;
        }
        
        .ui-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #05a;
            cursor: pointer;
            border: none;
        }
        
        .ui-slider-value {
            font-family: monospace;
            font-size: 12px;
            color: #ccc;
            min-width: 40px;
            text-align: center;
        }
    `;
}

/**
 * Get mode selector styles
 */
export function getModeStyles(): string {
    return `
        /* Mode Selector Styles */
        .ui-mode-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 2px solid #444;
            padding-bottom: 15px;
        }
        
        .ui-mode-button {
            padding: 10px 20px;
            border: 2px solid #555;
            border-radius: 5px;
            background: #333;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
            font-weight: bold;
        }
        
        .ui-mode-button:hover {
            background: #444;
            border-color: #666;
        }
        
        .ui-mode-button.active {
            background: #05a;
            border-color: #07c;
        }
    `;
}

/**
 * Get tab interface styles
 */
export function getTabStyles(): string {
    return `
        /* Tab Interface Styles */
        .ui-tabbed-interface {
            background: #2a2a2a;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .ui-tab-headers {
            display: flex;
            background: #333;
            border-bottom: 2px solid #444;
        }
        
        .ui-tab-header {
            padding: 15px 20px;
            border: none;
            background: transparent;
            color: #ccc;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            font-weight: bold;
            border-bottom: 3px solid transparent;
        }
        
        .ui-tab-header:hover {
            background: #444;
            color: white;
        }
        
        .ui-tab-header.active {
            background: #2a2a2a;
            color: white;
            border-bottom-color: #05a;
        }
        
        .ui-tab-contents {
            position: relative;
        }
        
        .ui-tab-content {
            display: none;
            padding: 20px;
        }
        
        .ui-tab-content.active {
            display: block;
        }
    `;
}

/**
 * Get all standard UI styles combined
 */
export function getAllUIStyles(): string {
    return [
        getBaseComponentStyles(),
        getButtonStyles(),
        getFormStyles(),
        getModeStyles(),
        getTabStyles()
    ].join('\n\n');
}

// ===== COMPONENT-SPECIFIC STYLE GENERATORS =====

/**
 * Generate styles for specific component
 */
export function generateComponentStyles(
    componentName: string,
    customStyles: string = ''
): string {
    const baseStyles = getAllUIStyles();
    const componentPrefix = `.${componentName.toLowerCase()}`;
    
    return `
/* ${componentName} Component Styles */
${componentPrefix} {
    background: #2a2a2a;
    border-radius: 5px;
    padding: 15px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
}

${baseStyles}

/* Custom Component Styles */
${customStyles}
    `.trim();
}

/**
 * Generate grid styles with custom columns
 */
export function generateGridStyles(
    selector: string,
    minColumnWidth: string = '200px',
    gap: string = '15px'
): string {
    return `
${selector} {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(${minColumnWidth}, 1fr));
    gap: ${gap};
}
    `.trim();
}

/**
 * Generate responsive breakpoint styles
 */
export function generateResponsiveStyles(
    selector: string,
    desktopStyles: string,
    tabletStyles: string = '',
    mobileStyles: string = ''
): string {
    return `
/* Desktop Styles */
${selector} {
    ${desktopStyles}
}

/* Tablet Styles */
@media (max-width: 768px) {
    ${selector} {
        ${tabletStyles}
    }
}

/* Mobile Styles */
@media (max-width: 480px) {
    ${selector} {
        ${mobileStyles}
    }
}
    `.trim();
}

// ===== UTILITY CLASSES =====

/**
 * Get utility CSS classes
 */
export function getUtilityStyles(): string {
    return `
        /* Utility Classes */
        .ui-hidden { display: none !important; }
        .ui-visible { display: block !important; }
        .ui-flex { display: flex !important; }
        .ui-flex-column { flex-direction: column !important; }
        .ui-flex-center { justify-content: center !important; align-items: center !important; }
        .ui-text-center { text-align: center !important; }
        .ui-text-left { text-align: left !important; }
        .ui-text-right { text-align: right !important; }
        .ui-m-0 { margin: 0 !important; }
        .ui-p-0 { padding: 0 !important; }
        .ui-mb-10 { margin-bottom: 10px !important; }
        .ui-mt-10 { margin-top: 10px !important; }
        .ui-pb-10 { padding-bottom: 10px !important; }
        .ui-pt-10 { padding-top: 10px !important; }
        .ui-full-width { width: 100% !important; }
        .ui-half-width { width: 50% !important; }
    `;
}

// ===== STYLE PRESETS =====

export const STYLE_PRESETS = {
    darkTheme: {
        background: '#2a2a2a',
        surface: '#333',
        primary: '#05a',
        secondary: '#555',
        text: 'white',
        textSecondary: '#ccc',
        border: '#444',
        hover: '#444'
    },
    
    lightTheme: {
        background: '#f5f5f5',
        surface: 'white',
        primary: '#007acc',
        secondary: '#e0e0e0',
        text: '#333',
        textSecondary: '#666',
        border: '#ddd',
        hover: '#f0f0f0'
    }
} as const;

/**
 * Apply theme to component styles
 */
export function applyTheme(
    styles: string,
    theme: typeof STYLE_PRESETS.darkTheme
): string {
    return styles
        .replace(/background: #2a2a2a/g, `background: ${theme.background}`)
        .replace(/background: #333/g, `background: ${theme.surface}`)
        .replace(/color: white/g, `color: ${theme.text}`)
        .replace(/color: #ccc/g, `color: ${theme.textSecondary}`)
        .replace(/border.*: #444/g, `border-color: ${theme.border}`)
        .replace(/background: #444/g, `background: ${theme.hover}`);
}