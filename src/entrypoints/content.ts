import { detectFieldType, getLabelText } from "@/lib/fieldDetector";
import {
  generateValue,
  createLocationContext,
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

function countFillableInputs(): number {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea',
  );

  return elements.length;
}

function fillAllInputs(config: FakerConfig, locale?: string) {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea',
  );

  const fields: SemanticField[] = [];
  let autoId = 0;

  elements.forEach((el) => {
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
        fillInput(group.primary.element, value);
        fillInput(group.confirm.element, value);
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
      if (value) fillInput(group.field.element, value);
    }
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
