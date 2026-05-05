import {
  detectFieldType,
  detectSelectFieldType,
  detectSelectElementType,
  type SelectElementType,
  getLabelText,
} from "@/lib/fieldDetector";
import {
  generateValue,
  createLocationContext,
  validateSelectValue,
  type FakerConfig,
} from "@/lib/fakerEngine";
import { buildGroups, type SemanticField } from "@/lib/semanticGrouper";
import { browser } from "wxt/browser";

// Since the modern javascript frameworks detect changes through events
// it's not as simple as just input.value = 'something'
function fillInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  // Use the correct prototype setter based on element type
  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value",
  )?.set;

  nativeInputSetter?.call(input, value);

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export function fillSelect(
  select: HTMLSelectElement,
  value: string,
): boolean {
  // Guard: disabled
  if (select.disabled) {
    console.debug("[fake-my-forms] Skipped disabled select", select);
    return false;
  }

  // Guard: multiple
  if (select.multiple) {
    console.debug("[fake-my-forms] Skipped multiple select", select);
    return false;
  }

  // Guard: zero options
  if (select.options.length === 0) {
    console.debug("[fake-my-forms] Skipped select with zero options", select);
    return false;
  }

  const search = value.toLowerCase().trim();

  // Validate: check if value matches any available option
  const validation = validateSelectValue(select, value);
  if (!validation.isValid) {
    const availableOptions = validation.availableOptions.join(", ");
    console.warn(
      `[fake-my-forms] No matching option for '${value}' in [${availableOptions}]`,
      select
    );
    return false;
  }

  // Iterate options in DOM order, find first match
  for (const option of Array.from(select.options)) {
    const optionText = (option.text ?? "").toLowerCase();
    const optionValue = (option.value ?? "").toLowerCase();

    // REQ-9: case-insensitive partial substring matching
    // Match if either text or value contains the search term, or vice versa
    const matches =
      optionText.includes(search) ||
      optionValue.includes(search) ||
      search.includes(optionText) ||
      search.includes(optionValue);

    if (matches) {
      // REQ-4: set select.value — uses patched prototype from tests/setup.ts
      select.value = option.value;

      // REQ-4: dispatch input and change events (bubbles: true)
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  // No match found (should not reach here if validation passed, but safety fallback)
  const availableOptions = Array.from(select.options).map(o => o.text || o.value).join(", ");
  console.warn(
    `[fake-my-forms] No matching option for '${value}' in [${availableOptions}]`,
    select
  );
  return false;
}

/**
 * Handles framework-specific dropdowns (Vue/React) by simulating user interaction.
 * Clicks to open the dropdown, waits for options to render, finds matching option,
 * and clicks it. Dispatches change event on the container.
 */
export function handleFrameworkDropdown(
  element: HTMLElement,
  value: string,
  elementType: SelectElementType
): boolean {
  // Validate value against available options first
  const validation = validateSelectValue(element, value);
  if (!validation.isValid) {
    const availableOptions = validation.availableOptions.join(", ");
    console.warn(
      `[fake-my-forms] No matching option for '${value}' in framework dropdown [${availableOptions}]`,
      element
    );
    return false;
  }

  // Click to open dropdown
  element.click();

  // Use setTimeout to wait for options to render (framework-specific rendering)
  setTimeout(() => {
    // Query for option elements within the dropdown
    const options = element.querySelectorAll('[role="option"], li, [data-value]');
    const search = value.toLowerCase().trim();

    for (const option of Array.from(options)) {
      const text = (option.textContent ?? '').toLowerCase();
      const dataValue = (option.getAttribute('data-value') || '').toLowerCase();

      if (text.includes(search) || dataValue.includes(search)) {
        // Click the matching option
        (option as HTMLElement).click();

        // Dispatch change event on the container
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }

    // No match found after opening - close dropdown by clicking container again
    console.warn(
      `[fake-my-forms] No matching option found after opening dropdown for '${value}'`,
      element
    );
    element.click(); // Close the dropdown
  }, 100);

  return true; // Optimistic return
}

export function countFillableInputs(): number {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select',
  );

  // Filter out disabled and multiple selects (REQ-1)
  return Array.from(elements).filter((el) => {
    if (el instanceof HTMLSelectElement) {
      return !el.disabled && !el.multiple;
    }
    return true;
  }).length;
}

// Exported for testing purposes
export function fillAllInputs(config: FakerConfig, locale?: string) {
  // Extended query: include framework dropdowns (Vue/React custom dropdowns)
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [role="combobox"], [role="listbox"], .dropdown, .select-menu',
  );

  const fields: SemanticField[] = [];
  let autoId = 0;

  // Summary statistics
  const stats = {
    totalSelects: 0,
    filled: 0,
    skipped: 0,
    frameworkDropdowns: 0,
  };

  elements.forEach((el) => {
    // Handle select elements (native)
    if (el instanceof HTMLSelectElement) {
      stats.totalSelects++;
      const fieldType = detectSelectFieldType(el);
      fields.push({
        id: el.id || `_fmf_${autoId++}`,
        element: el,
        fieldType,
        name: el.name,
        label: getLabelText(el),
      });
      return;
    }

    // Handle framework dropdowns (Vue/React custom dropdowns)
    const elementType = detectSelectElementType(el);
    if (elementType && elementType !== 'native-select') {
      stats.totalSelects++;
      stats.frameworkDropdowns++;
      const fieldType = detectSelectFieldType(el);
      fields.push({
        id: el.id || `_fmf_${autoId++}`,
        element: el,
        fieldType,
        name: el.getAttribute('name') || '',
        label: getLabelText(el as unknown as HTMLSelectElement),
        // Mark as framework dropdown for special handling
        isFrameworkDropdown: true,
        frameworkType: elementType,
      });
      return;
    }

    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const fieldType =
      input instanceof HTMLInputElement
        ? detectFieldType(input)
        : ("text" as const);
    fields.push({
      id: input.id || `_fmf_${autoId++}`,
      element: input,
      fieldType,
      name: input instanceof HTMLInputElement ? input.name : "",
      label: getLabelText(input),
    });
  });

  const groups = buildGroups(fields);
  const locationContext = createLocationContext(locale);

  for (const group of groups) {
    if (group.type === "confirm-pair") {
      const fieldConfig = config[group.primary.fieldType] ?? {
        enabled: true,
        probability: 100,
        customValues: [],
      };
      const value = generateValue(
        group.primary.fieldType,
        fieldConfig,
        locationContext,
      );
      if (value) {
        // Check if it's a framework dropdown
        const primaryField = group.primary as SemanticField & { isFrameworkDropdown?: boolean; frameworkType?: SelectElementType };
        if (primaryField.isFrameworkDropdown && primaryField.frameworkType) {
          const filled = handleFrameworkDropdown(primaryField.element as HTMLElement, value, primaryField.frameworkType);
          if (filled) stats.filled++; else stats.skipped++;
        } else if (group.primary.element instanceof HTMLSelectElement) {
          const filled = fillSelect(group.primary.element, value);
          if (filled) stats.filled++; else stats.skipped++;
        } else {
          const el = group.primary.element;
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            fillInput(el, value);
          }
        }

        // Fill confirm element
        const confirmField = group.confirm as SemanticField & { isFrameworkDropdown?: boolean; frameworkType?: SelectElementType };
        if (confirmField.isFrameworkDropdown && confirmField.frameworkType) {
          const filled = handleFrameworkDropdown(confirmField.element as HTMLElement, value, confirmField.frameworkType);
          if (filled) stats.filled++; else stats.skipped++;
        } else if (group.confirm.element instanceof HTMLSelectElement) {
          const filled = fillSelect(group.confirm.element, value);
          if (filled) stats.filled++; else stats.skipped++;
        } else {
          const el = group.confirm.element;
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            fillInput(el, value);
          }
        }
      }
    } else {
      const fieldConfig = config[group.field.fieldType] ?? {
        enabled: true,
        probability: 100,
        customValues: [],
      };
      const value = generateValue(
        group.field.fieldType,
        fieldConfig,
        locationContext,
      );
      if (value) {
        // Check if it's a framework dropdown
        const field = group.field as SemanticField & { isFrameworkDropdown?: boolean; frameworkType?: SelectElementType };
        if (field.isFrameworkDropdown && field.frameworkType) {
          const filled = handleFrameworkDropdown(field.element as HTMLElement, value, field.frameworkType);
          if (filled) stats.filled++; else stats.skipped++;
        } else if (group.field.element instanceof HTMLSelectElement) {
          const filled = fillSelect(group.field.element, value);
          if (filled) stats.filled++; else stats.skipped++;
        } else {
          const el = group.field.element;
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            fillInput(el, value);
          }
        }
      }
    }
  }

  // Log summary statistics
  console.debug('[fake-my-forms] fillAllInputs summary:', stats);
}

async function getStoredFakerConfig(): Promise<FakerConfig> {
  const storage = browser.storage;
  if (!storage) return {};

  try {
    if (storage.sync) {
      const { fakerConfig } = await storage.sync.get("fakerConfig");
      return (fakerConfig ?? {}) as FakerConfig;
    }
  } catch (error) {
    console.warn("[fake-my-forms] Failed reading sync storage:", error);
  }

  try {
    if (storage.local) {
      const { fakerConfig } = await storage.local.get("fakerConfig");
      return (fakerConfig ?? {}) as FakerConfig;
    }
  } catch (error) {
    console.warn("[fake-my-forms] Failed reading local storage:", error);
  }

  return {};
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    // Listen popup messages
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "FILL_FORM") {
        fillAllInputs(message.config, message.locale);
      }
    });
    // Count forms' inputs
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "GET_INPUT_STATS") {
        const count = countFillableInputs();
        return Promise.resolve({ count });
      }
    });

    // Listen keyboard shortcut
    document.addEventListener("keydown", async (e) => {
      if (e.altKey && e.shiftKey && e.key === "F") {
        const fakerConfig = await getStoredFakerConfig();
        fillAllInputs(fakerConfig);
      }
    });
  },
});
