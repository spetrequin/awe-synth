/**
 * Shared UI Component Utilities
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides reusable UI component creation patterns to eliminate duplicate code
 * across different interface components.
 */
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
/**
 * Safely get container element with error handling
 */
export declare function getContainer(containerId: string, componentName?: string): HTMLElement | null;
/**
 * Create main component container with validation
 */
export declare function createComponentContainer(containerId: string, className: string, componentName?: string): HTMLElement | null;
/**
 * Create standardized button with click handler
 */
export declare function createButton(config: ButtonConfig): HTMLButtonElement;
/**
 * Create standardized select dropdown
 */
export declare function createSelect(options: SelectOption[], onChange: (value: string) => void, className?: string): HTMLSelectElement;
/**
 * Create standardized checkbox with label
 */
export declare function createCheckbox(config: CheckboxConfig): HTMLElement;
/**
 * Create standardized range slider
 */
export declare function createSlider(config: SliderConfig): HTMLElement;
/**
 * Create labeled form field
 */
export declare function createLabeledField(label: string, field: HTMLElement): HTMLElement;
/**
 * Create standardized section with title
 */
export declare function createSection(config: SectionConfig): HTMLElement;
/**
 * Create button group container
 */
export declare function createButtonGroup(buttons: ButtonConfig[], className?: string): HTMLElement;
/**
 * Create grid container for form elements
 */
export declare function createGrid(elements: HTMLElement[], className?: string): HTMLElement;
/**
 * Create tabbed interface
 */
export declare function createTabbedInterface(tabs: Array<{
    id: string;
    label: string;
    content: HTMLElement;
    active?: boolean;
}>): {
    container: HTMLElement;
    setActiveTab: (tabId: string) => void;
};
/**
 * Capitalize first letter of string
 */
export declare function capitalize(str: string): string;
/**
 * Create range of numbers for select options
 */
export declare function createNumberRange(min: number, max: number, prefix?: string): SelectOption[];
/**
 * Convert object entries to select options
 */
export declare function objectToSelectOptions<T>(obj: Record<string, T>, formatter?: (key: string, value: T) => string): SelectOption[];
/**
 * Debounce function for input events
 */
export declare function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Create preset/quick select buttons section
 */
export declare function createPresetSection<T>(title: string, presets: Record<string, T>, onPresetSelect: (name: string, preset: T) => void, onReset?: () => void): HTMLElement;
/**
 * Create mode selector (like Instruments/Drums toggle)
 */
export declare function createModeSelector(modes: Array<{
    id: string;
    label: string;
}>, activeMode: string, onModeChange: (modeId: string) => void): HTMLElement;
/**
 * Validate and set element value with error handling
 */
export declare function setElementValue(element: HTMLElement, property: string, value: any, validator?: (value: any) => boolean): boolean;
//# sourceMappingURL=ui-components.d.ts.map