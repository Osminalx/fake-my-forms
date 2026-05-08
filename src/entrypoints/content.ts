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
  // File inputs cannot be set programmatically — browsers throw InvalidStateError
  if (input instanceof HTMLInputElement && input.type === 'file') return;

  // Use the correct prototype setter based on element type
  const prototype =
    input instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;

  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    prototype,
    "value",
  )?.set;

  try {
    nativeInputSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  } catch (e) {
    console.debug('[fake-my-forms] fillInput skipped restricted input', input.type, e);
  }
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
    // Skip disabled and empty-value placeholder options
    if (option.disabled || option.value === "") continue;

    const optionText = (option.text ?? "").toLowerCase();
    const optionValue = (option.value ?? "").toLowerCase();

    // REQ-9: case-insensitive partial substring matching
    // Match if either text or value contains the search term, or vice versa
    // Guard against empty strings — an empty optionText/optionValue matches everything
    const matches =
      optionText.includes(search) ||
      optionValue.includes(search) ||
      (optionText.length > 0 && search.includes(optionText)) ||
      (optionValue.length > 0 && search.includes(optionValue));

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
  const dbg = (msg: string, ...args: unknown[]) =>
    console.debug(`[fake-my-forms][fw-dropdown] ${msg}`, ...args);

  dbg('called', {
    id: element.id,
    tag: element.tagName,
    role: element.getAttribute('role'),
    isConnected: element.isConnected,
    disabled: element.hasAttribute('disabled'),
    ariaDisabled: element.getAttribute('aria-disabled'),
    closestAriaDisabled: element.closest('[aria-disabled="true"]') !== null,
    value,
    elementType,
  });

  // Guard: disabled
  if (
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.closest('[aria-disabled="true"]') !== null
  ) {
    dbg('SKIP disabled', element.id);
    return false;
  }

  // For input-based framework selects (React Select, Vue Select with inner input):
  // Typing into the input triggers onInputChange → React Select calls onMenuOpen() internally.
  // This is more reliable than dispatching mousedown, which requires the component
  // to already be in a focused state to open the menu.
  //
  // For non-input containers: fall back to mousedown on the control.
  const nativeInputSetter = element instanceof HTMLInputElement
    ? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    : null;

  try {
    if (nativeInputSetter) {
      dbg('open strategy: type value into input', element.id);
      nativeInputSetter.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const control =
        element.closest<HTMLElement>('[class*="-control"], [class*="__control"]') ??
        element;
      dbg('open strategy: mousedown on control', { id: element.id, controlClass: control.className });
      control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      control.click();
    }
    dbg('open dispatched', element.id);
  } catch (e) {
    dbg('open dispatch THREW', e);
    return false;
  }

  // Wait for framework to render options (may be portaled anywhere in the document)
  setTimeout(() => {
    dbg('setTimeout fired', { id: element.id, isConnected: element.isConnected });

    // Element may have been removed by a re-render between click and timeout
    if (!element.isConnected) {
      dbg('element disconnected after click, aborting', element.id);
      return;
    }

    // Portal-aware: search the entire document, not just element's subtree
    const options = document.querySelectorAll('[role="option"]');
    dbg('options found in document', options.length, Array.from(options).map(o => o.textContent?.trim()));

    const closeDropdown = () => {
      dbg('closing dropdown via Escape', element.id);
      try {
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      } catch (e) {
        dbg('Escape dispatch threw', e);
      }
    };

    if (options.length === 0) {
      console.warn('[fake-my-forms] No options found after opening framework dropdown', element);
      closeDropdown();
      return;
    }

    const search = value.toLowerCase().trim();
    dbg('searching for', search, 'among', options.length, 'options');

    for (const option of Array.from(options)) {
      if (option.getAttribute('aria-disabled') === 'true') continue;

      const text = (option.textContent ?? '').toLowerCase().trim();
      const dataValue = (option.getAttribute('data-value') ?? '').toLowerCase();

      // Bidirectional substring match (same logic as fillSelect)
      if (
        text.includes(search) ||
        search.includes(text) ||
        dataValue.includes(search) ||
        search.includes(dataValue)
      ) {
        dbg('match found, clicking option', text);
        try {
          (option as HTMLElement).click();
          dbg('option.click() succeeded');
        } catch (e) {
          dbg('option.click() THREW', e);
        }
        try {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {
          dbg('change dispatch threw', e);
        }
        return;
      }
    }

    console.warn(`[fake-my-forms] No matching option found for '${value}'. Available: [${Array.from(options).map(o => o.textContent?.trim()).join(', ')}]`, element);
    // Clear the typed search text so the input doesn't show a half-filled value
    if (nativeInputSetter && element.isConnected) {
      try {
        nativeInputSetter.call(element, '');
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } catch { /* ignore */ }
    }
    closeDropdown();
  }, 300);

  return true; // Optimistic — actual fill is async
}

/**
 * Picks a random valid option from a select element.
 * Used as fallback when fieldType is unknown and no semantic value can be generated.
 */
function fillSelectRandom(select: HTMLSelectElement): boolean {
  if (select.disabled || select.multiple) return false;
  const validOptions = Array.from(select.options).filter(
    (o) => !o.disabled && o.value !== "",
  );
  if (validOptions.length === 0) return false;

  const picked = validOptions[Math.floor(Math.random() * validOptions.length)];
  select.value = picked.value;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function countFillableInputs(): number {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select',
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
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [role="combobox"], [role="listbox"], .dropdown, .select-menu',
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
      console.debug('[fake-my-forms][discovery] framework dropdown', {
        id: el.id,
        tag: el.tagName,
        role: el.getAttribute('role'),
        elementType,
        fieldType,
        disabled: (el as HTMLElement).hasAttribute('disabled'),
        ariaDisabled: el.getAttribute('aria-disabled'),
      });
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
    // File inputs cannot be filled programmatically
    if (el instanceof HTMLInputElement && el.type === 'file') return;

    const input = el as HTMLInputElement | HTMLTextAreaElement;
    const fieldType = detectFieldType(input);
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

  console.debug('[fake-my-forms][fill] groups to process:', groups.length, groups.map(g =>
    g.type === 'confirm-pair'
      ? { type: 'confirm-pair', primary: { id: g.primary.id, fieldType: g.primary.fieldType } }
      : { type: 'single', id: g.field.id, fieldType: g.field.fieldType, isFrameworkDropdown: (g.field as SemanticField & { isFrameworkDropdown?: boolean }).isFrameworkDropdown }
  ));

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
      console.debug('[fake-my-forms][fill] confirm-pair', group.primary.fieldType, '→ value:', value);
      if (value) {
        // Check if it's a framework dropdown
        const primaryField = group.primary as SemanticField & { isFrameworkDropdown?: boolean; frameworkType?: SelectElementType };
        if (primaryField.isFrameworkDropdown && primaryField.frameworkType) {
          if (primaryField.fieldType === 'unknown') {
            console.debug('[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType', primaryField.id);
            stats.skipped++;
          } else {
            const filled = handleFrameworkDropdown(primaryField.element as HTMLElement, value, primaryField.frameworkType);
            if (filled) stats.filled++; else stats.skipped++;
          }
        } else if (group.primary.element instanceof HTMLSelectElement) {
          const filled = value
            ? fillSelect(group.primary.element, value) || fillSelectRandom(group.primary.element)
            : fillSelectRandom(group.primary.element);
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
          if (confirmField.fieldType === 'unknown') {
            console.debug('[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType', confirmField.id);
            stats.skipped++;
          } else {
            const filled = handleFrameworkDropdown(confirmField.element as HTMLElement, value, confirmField.frameworkType);
            if (filled) stats.filled++; else stats.skipped++;
          }
        } else if (group.confirm.element instanceof HTMLSelectElement) {
          const filled = value
            ? fillSelect(group.confirm.element, value) || fillSelectRandom(group.confirm.element)
            : fillSelectRandom(group.confirm.element);
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
      const field = group.field as SemanticField & { isFrameworkDropdown?: boolean; frameworkType?: SelectElementType };
      console.debug('[fake-my-forms][fill] single', field.fieldType, field.id, '→ value:', value, '| isFrameworkDropdown:', field.isFrameworkDropdown);
      if (field.isFrameworkDropdown && field.frameworkType) {
        if (!value || field.fieldType === 'unknown') {
          console.debug('[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType', field.id);
          stats.skipped++;
        } else {
          const filled = handleFrameworkDropdown(field.element as HTMLElement, value, field.frameworkType);
          if (filled) stats.filled++; else stats.skipped++;
        }
      } else if (group.field.element instanceof HTMLSelectElement) {
        // Native select: try semantic fill first, fall back to random option pick
        const filled = value
          ? fillSelect(group.field.element, value) || fillSelectRandom(group.field.element)
          : fillSelectRandom(group.field.element);
        if (filled) stats.filled++; else stats.skipped++;
      } else if (value) {
        const el = group.field.element;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          fillInput(el, value);
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
