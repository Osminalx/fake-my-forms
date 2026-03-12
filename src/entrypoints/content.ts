import { detectFieldType } from "@/lib/fieldDetector";
import { generateValue, type FakerConfig } from "@/lib/fakerEngine";
import { browser } from "wxt/browser";

// Since the modern javascript frameworks detect changes through events
// it's not as simple as just input.value = 'something'
function fillInput(input: HTMLInputElement, value: string) {
  const nativeInputSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  nativeInputSetter?.call(input, value);

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillAllInputs(config: FakerConfig) {
  const inputs = document.querySelectorAll<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea',
  );

  inputs.forEach((input) => {
    const fieldType = detectFieldType(input);
    const fieldConfig = config[fieldType] ?? {
      enabled: true,
      probability: 100,
      customValues: [],
    };
    const value = generateValue(fieldType, fieldConfig);
    if (value) fillInput(input, value);
  });
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
        fillAllInputs(message.config);
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
