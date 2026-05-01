import { detectFieldType, getLabelText } from "@/lib/fieldDetector";
import {
  generateValue,
  createLocationContext,
  type FakerConfig,
} from "@/lib/fakerEngine";
import { buildGroups, type SemanticField } from "@/lib/semanticGrouper";
import { browser } from "wxt/browser";

const ELEMENT_SELECTOR =
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select';

// Since the modern javascript frameworks detect changes through events
// it's not as simple as just input.value = 'something'
function fillInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
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

function fillSelect(select: HTMLSelectElement, value: string) {
  const lower = value.toLowerCase();

  // Try to find an option whose text or value contains the faker value
  let targetIndex = -1;
  for (let i = 0; i < select.options.length; i++) {
    const opt = select.options[i];
    if (
      opt.value.toLowerCase().includes(lower) ||
      opt.text.toLowerCase().includes(lower)
    ) {
      targetIndex = i;
      break;
    }
  }

  // Fall back to first non-empty option
  if (targetIndex === -1) {
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value !== "") {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex === -1) return;

  const nativeSelectSetter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )?.set;

  nativeSelectSetter?.call(select, select.options[targetIndex].value);

  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.offsetParent !== null &&
    getComputedStyle(el).display !== "none" &&
    getComputedStyle(el).visibility !== "hidden"
  );
}

const OPTION_SELECTORS = [
  "[role='option']",
  "[role='listbox'] li",
  "[aria-selected]",
];

function findVisibleOption(input: HTMLInputElement): HTMLElement | null {
  // Walk up 4 ancestor levels first (same-tree dropdowns)
  let ancestor: Element | null = input.parentElement;
  for (let i = 0; i < 4 && ancestor; i++) {
    for (const selector of OPTION_SELECTORS) {
      const option = ancestor.querySelector(selector);
      if (option && isVisible(option)) return option as HTMLElement;
    }
    ancestor = ancestor.parentElement;
  }

  // Portal fallback: dropdown appended to body (Vue <teleport>, React portals)
  for (const selector of OPTION_SELECTORS) {
    const option = document.body.querySelector(selector);
    if (option && isVisible(option)) return option as HTMLElement;
  }

  return null;
}

// Generic autocomplete resolution — framework-agnostic.
// Runs AFTER all synchronous fills are done to avoid blocking the fill phase.
// Waits 100ms for Vue/React/Angular to update the DOM, then clicks the first
// visible [role="option"] or equivalent. Gracefully no-ops if nothing appears.
async function resolveAutocomplete(input: HTMLInputElement): Promise<void> {
  // Check synchronously first (some components update in the same tick)
  const immediate = findVisibleOption(input);
  if (immediate) {
    immediate.click();
    return;
  }

  // Wait for async DOM updates (Vue nextTick, React batched updates, etc.)
  await new Promise((resolve) => setTimeout(resolve, 100));

  const deferred = findVisibleOption(input);
  if (deferred) deferred.click();
}

function countFillableInputs(): number {
  return document.querySelectorAll(ELEMENT_SELECTOR).length;
}

async function fillAllInputs(config: FakerConfig, locale?: string) {
  const elements = document.querySelectorAll(ELEMENT_SELECTOR);

  const fields: SemanticField[] = [];
  let autoId = 0;

  elements.forEach((el) => {
    if (
      !(el instanceof HTMLInputElement) &&
      !(el instanceof HTMLTextAreaElement) &&
      !(el instanceof HTMLSelectElement)
    ) {
      return;
    }

    const fieldType =
      el instanceof HTMLTextAreaElement
        ? ("text" as const)
        : detectFieldType(el as HTMLInputElement | HTMLSelectElement);

    fields.push({
      id: el.id || `_fmf_${autoId++}`,
      element: el,
      fieldType,
      name: el instanceof HTMLTextAreaElement ? "" : el.name,
      label: getLabelText(el),
    });
  });

  const groups = buildGroups(fields);
  const locationContext = createLocationContext(locale);

  // Collect inputs that may need autocomplete resolution after filling
  const toResolve: HTMLInputElement[] = [];

  // Phase 1: fill all elements synchronously (no awaits here)
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
        if (group.primary.element instanceof HTMLSelectElement) {
          fillSelect(group.primary.element, value);
        } else {
          fillInput(
            group.primary.element as HTMLInputElement | HTMLTextAreaElement,
            value,
          );
          toResolve.push(group.primary.element as HTMLInputElement);
        }
        if (group.confirm.element instanceof HTMLSelectElement) {
          fillSelect(group.confirm.element, value);
        } else {
          fillInput(
            group.confirm.element as HTMLInputElement | HTMLTextAreaElement,
            value,
          );
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
        if (group.field.element instanceof HTMLSelectElement) {
          fillSelect(group.field.element, value);
        } else {
          fillInput(
            group.field.element as HTMLInputElement | HTMLTextAreaElement,
            value,
          );
          toResolve.push(group.field.element as HTMLInputElement);
        }
      }
    }
  }

  // Phase 2: resolve any autocomplete dropdowns that appeared after filling
  for (const input of toResolve) {
    await resolveAutocomplete(input);
  }
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
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "FILL_FORM") {
        fillAllInputs(message.config, message.locale);
      }
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "GET_INPUT_STATS") {
        const count = countFillableInputs();
        return Promise.resolve({ count });
      }
    });

    document.addEventListener("keydown", async (e) => {
      if (e.altKey && e.shiftKey && e.key === "F") {
        const fakerConfig = await getStoredFakerConfig();
        fillAllInputs(fakerConfig);
      }
    });
  },
});
