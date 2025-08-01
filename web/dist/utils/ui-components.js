/**
 * Shared UI Component Utilities
 * Part of AWE Player EMU8000 Emulator
 *
 * Provides reusable UI component creation patterns to eliminate duplicate code
 * across different interface components.
 */
import { DEBUG_LOGGERS } from './debug-logger.js';
// ===== CONTAINER AND VALIDATION UTILITIES =====
/**
 * Safely get container element with error handling
 */
export function getContainer(containerId, componentName = 'Component') {
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
export function createComponentContainer(containerId, className, componentName = 'Component') {
    const container = getContainer(containerId, componentName);
    if (!container)
        return null;
    const element = document.createElement('div');
    element.className = className;
    container.appendChild(element);
    return element;
}
// ===== FORM ELEMENT FACTORIES =====
/**
 * Create standardized button with click handler
 */
export function createButton(config) {
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
export function createSelect(options, onChange, className = 'ui-select') {
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
        onChange(e.target.value);
    });
    return select;
}
/**
 * Create standardized checkbox with label
 */
export function createCheckbox(config) {
    const container = document.createElement('label');
    container.className = 'ui-checkbox-container';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = config.checked;
    if (config.disabled) {
        checkbox.disabled = true;
    }
    checkbox.addEventListener('change', (e) => {
        config.onChange(e.target.checked);
    });
    container.appendChild(checkbox);
    container.appendChild(document.createTextNode(' ' + config.label));
    return container;
}
/**
 * Create standardized range slider
 */
export function createSlider(config) {
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
        const value = parseFloat(e.target.value);
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
export function createLabeledField(label, field) {
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
export function createSection(config) {
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
export function createButtonGroup(buttons, className = 'ui-button-group') {
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
export function createGrid(elements, className = 'ui-grid') {
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
export function createTabbedInterface(tabs) {
    const container = document.createElement('div');
    container.className = 'ui-tabbed-interface';
    const tabHeaders = document.createElement('div');
    tabHeaders.className = 'ui-tab-headers';
    const tabContents = document.createElement('div');
    tabContents.className = 'ui-tab-contents';
    let activeTabId = tabs.find(tab => tab.active)?.id || tabs[0]?.id;
    const setActiveTab = (tabId) => {
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
export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Create range of numbers for select options
 */
export function createNumberRange(min, max, prefix = '') {
    const options = [];
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
export function objectToSelectOptions(obj, formatter) {
    return Object.entries(obj).map(([key, value]) => ({
        value: key,
        text: formatter ? formatter(key, value) : capitalize(key)
    }));
}
/**
 * Debounce function for input events
 */
export function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => func(...args), delay);
    };
}
// ===== PRESET PATTERNS =====
/**
 * Create preset/quick select buttons section
 */
export function createPresetSection(title, presets, onPresetSelect, onReset) {
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
export function createModeSelector(modes, activeMode, onModeChange) {
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
export function setElementValue(element, property, value, validator) {
    if (validator && !validator(value)) {
        DEBUG_LOGGERS.configLoader.warn(`Invalid value for ${property}: ${value}`);
        return false;
    }
    try {
        element[property] = value;
        return true;
    }
    catch (error) {
        DEBUG_LOGGERS.configLoader.error(`Failed to set ${property}`, error);
        return false;
    }
}
//# sourceMappingURL=ui-components.js.map