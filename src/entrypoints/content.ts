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

export function fillAllInputs(config: FakerConfig) {
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

// Listen popups messages
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "FILL_FORM") {
    fillAllInputs(message.config);
  }
});

// Listen keyboard shortcut
document.addEventListener("keydown", (e) => {
  if (e.altKey && e.shiftKey && e.key === "F") {
    browser.storage.sync.get("fakerConfig", ({ fakerConfig }) => {
      fillAllInputs(fakerConfig ?? {});
    });
  }
});
