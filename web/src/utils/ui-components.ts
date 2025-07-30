/**
 * Shared UI Component Utilities
 * Part of AWE Player EMU8000 Emulator
 * 
 * Provides reusable UI component creation patterns to eliminate duplicate code
 * across different interface components.
 */

import { DEBUG_LOGGERS } from './debug-logger.js';

// ===== COMMON UI INTERFACES =====

export interface SelectOption {
    value: string;
    text: string;
    selected?: boolean;
}

export interface ButtonConfig {
    text: string;
    className?: string;
    disabled?: boolean;
    onClick: () => void;
}

export interface CheckboxConfig {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
}

export interface SliderConfig {
    min: number;
    max: number;
    value: number;
    step?: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}

export interface SectionConfig {
    title: string;
    className?: string;
    content?: HTMLElement[];
}

// ===== CONTAINER AND VALIDATION UTILITIES =====

/**
 * Safely get container element with error handling
 */
export function getContainer(containerId: string, componentName: string = 'Component'): HTMLElement | null {
    const container = document.getElementById(containerId);
    if (!container) {
        DEBUG_LOGGERS.configLoader.error(`${componentName}: Container '${containerId}' not found`);
        return null;
    }
    return container;
}

/**
 * Create main component container with validation
 */
export function createComponentContainer(
    containerId: string, 
    className: string, 
    componentName: string = 'Component'
): HTMLElement | null {
    const container = getContainer(containerId, componentName);
    if (!container) return null;
    
    const element = document.createElement('div');
    element.className = className;
    
    container.appendChild(element);
    return element;
}

// ===== FORM ELEMENT FACTORIES =====

/**
 * Create standardized button with click handler
 */
export function createButton(config: ButtonConfig): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = config.text;
    button.className = config.className || 'ui-button';
    
    if (config.disabled) {
        button.disabled = true;
    }
    
    button.addEventListener('click', config.onClick);
    
    return button;
}

/**
 * Create standardized select dropdown
 */
export function createSelect(
    options: SelectOption[], 
    onChange: (value: string) => void,
    className: string = 'ui-select'
): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = className;
    
    options.forEach(optionConfig => {
        const option = document.createElement('option');
        option.value = optionConfig.value;
        option.textContent = optionConfig.text;
        
        if (optionConfig.selected) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        onChange((e.target as HTMLSelectElement).value);
    });
    
    return select;
}

/**
 * Create standardized checkbox with label
 */
export function createCheckbox(config: CheckboxConfig): HTMLElement {
    const container = document.createElement('label');
    container.className = 'ui-checkbox-container';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = config.checked;
    
    if (config.disabled) {
        checkbox.disabled = true;
    }
    
    checkbox.addEventListener('change', (e) => {
        config.onChange((e.target as HTMLInputElement).checked);
    });
    
    container.appendChild(checkbox);
    container.appendChild(document.createTextNode(' ' + config.label));
    
    return container;
}

/**
 * Create standardized range slider
 */
export function createSlider(config: SliderConfig): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-slider-container';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.value = config.value.toString();
    slider.step = (config.step || 1).toString();
    slider.className = 'ui-slider';
    
    if (config.disabled) {
        slider.disabled = true;
    }
    
    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'ui-slider-value';
    valueDisplay.textContent = config.value.toString();
    
    slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        valueDisplay.textContent = value.toString();
        config.onChange(value);
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    return container;
}

/**
 * Create labeled form field
 */
export function createLabeledField(label: string, field: HTMLElement): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-field-container';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.className = 'ui-field-label';
    
    container.appendChild(labelElement);
    container.appendChild(field);
    
    return container;
}

// ===== SECTION AND LAYOUT UTILITIES =====

/**
 * Create standardized section with title
 */
export function createSection(config: SectionConfig): HTMLElement {
    const section = document.createElement('div');
    section.className = config.className || 'ui-section';
    
    if (config.title) {
        const title = document.createElement('h3');
        title.textContent = config.title;
        title.className = 'ui-section-title';
        section.appendChild(title);
    }
    
    if (config.content) {
        config.content.forEach(element => {
            section.appendChild(element);
        });
    }
    
    return section;
}

/**
 * Create button group container
 */
export function createButtonGroup(buttons: ButtonConfig[], className: string = 'ui-button-group'): HTMLElement {
    const group = document.createElement('div');
    group.className = className;
    
    buttons.forEach(buttonConfig => {
        const button = createButton(buttonConfig);
        group.appendChild(button);
    });
    
    return group;
}

/**
 * Create grid container for form elements
 */
export function createGrid(elements: HTMLElement[], className: string = 'ui-grid'): HTMLElement {
    const grid = document.createElement('div');
    grid.className = className;
    
    elements.forEach(element => {
        grid.appendChild(element);
    });
    
    return grid;
}

/**
 * Create tabbed interface
 */
export function createTabbedInterface(tabs: Array<{
    id: string;
    label: string;
    content: HTMLElement;
    active?: boolean;
}>): { container: HTMLElement; setActiveTab: (tabId: string) => void } {
    const container = document.createElement('div');
    container.className = 'ui-tabbed-interface';
    
    const tabHeaders = document.createElement('div');
    tabHeaders.className = 'ui-tab-headers';
    
    const tabContents = document.createElement('div');
    tabContents.className = 'ui-tab-contents';
    
    let activeTabId = tabs.find(tab => tab.active)?.id || tabs[0]?.id;
    
    const setActiveTab = (tabId: string) => {
        activeTabId = tabId;
        
        // Update tab headers
        tabHeaders.querySelectorAll('.ui-tab-header').forEach(header => {
            header.classList.toggle('active', header.getAttribute('data-tab') === tabId);
        });
        
        // Update tab contents
        tabContents.querySelectorAll('.ui-tab-content').forEach(content => {
            content.classList.toggle('active', content.getAttribute('data-tab') === tabId);
        });
    };
    
    tabs.forEach(tab => {
        // Create tab header
        const header = document.createElement('button');
        header.className = 'ui-tab-header';
        header.textContent = tab.label;
        header.setAttribute('data-tab', tab.id);
        header.addEventListener('click', () => setActiveTab(tab.id));
        
        if (tab.id === activeTabId) {
            header.classList.add('active');
        }
        
        tabHeaders.appendChild(header);
        
        // Create tab content
        const content = document.createElement('div');
        content.className = 'ui-tab-content';
        content.setAttribute('data-tab', tab.id);
        content.appendChild(tab.content);
        
        if (tab.id === activeTabId) {
            content.classList.add('active');
        }
        
        tabContents.appendChild(content);
    });
    
    container.appendChild(tabHeaders);
    container.appendChild(tabContents);
    
    return { container, setActiveTab };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Create range of numbers for select options
 */
export function createNumberRange(min: number, max: number, prefix: string = ''): SelectOption[] {
    const options: SelectOption[] = [];
    for (let i = min; i <= max; i++) {
        options.push({
            value: i.toString(),
            text: `${prefix}${i}`
        });
    }
    return options;
}

/**
 * Convert object entries to select options
 */
export function objectToSelectOptions<T>(
    obj: Record<string, T>, 
    formatter?: (key: string, value: T) => string
): SelectOption[] {
    return Object.entries(obj).map(([key, value]) => ({
        value: key,
        text: formatter ? formatter(key, value) : capitalize(key)
    }));
}

/**
 * Debounce function for input events
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: number;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func(...args), delay);
    };
}

// ===== PRESET PATTERNS =====

/**
 * Create preset/quick select buttons section
 */
export function createPresetSection<T>(
    title: string,
    presets: Record<string, T>,
    onPresetSelect: (name: string, preset: T) => void,
    onReset?: () => void
): HTMLElement {
    const section = createSection({ title, className: 'ui-preset-section' });
    
    const presetButtons = Object.entries(presets).map(([name, preset]) => ({
        text: capitalize(name),
        className: 'ui-preset-button',
        onClick: () => onPresetSelect(name, preset)
    }));
    
    if (onReset) {
        presetButtons.push({
            text: 'Reset',
            className: 'ui-preset-button ui-reset-button',
            onClick: onReset
        });
    }
    
    const buttonGroup = createButtonGroup(presetButtons, 'ui-preset-grid');
    section.appendChild(buttonGroup);
    
    return section;
}

/**
 * Create mode selector (like Instruments/Drums toggle)
 */
export function createModeSelector(
    modes: Array<{ id: string; label: string }>,
    activeMode: string,
    onModeChange: (modeId: string) => void
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-mode-selector';
    
    modes.forEach(mode => {
        const button = createButton({
            text: mode.label,
            className: `ui-mode-button ${mode.id === activeMode ? 'active' : ''}`,
            onClick: () => {
                // Update active state
                container.querySelectorAll('.ui-mode-button').forEach(btn => {
                    btn.classList.toggle('active', btn.textContent === mode.label);
                });
                onModeChange(mode.id);
            }
        });
        
        container.appendChild(button);
    });
    
    return container;
}

// ===== VALIDATION HELPERS =====

/**
 * Validate and set element value with error handling
 */
export function setElementValue(
    element: HTMLElement, 
    property: string, 
    value: any, 
    validator?: (value: any) => boolean
): boolean {
    if (validator && !validator(value)) {
        DEBUG_LOGGERS.configLoader.warn(`Invalid value for ${property}: ${value}`);
        return false;
    }
    
    try {
        (element as any)[property] = value;
        return true;
    } catch (error) {
        DEBUG_LOGGERS.configLoader.error(`Failed to set ${property}: ${error}`);
        return false;
    }
}