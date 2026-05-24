import { describe, it, expect, beforeAll, mock } from "bun:test";

// Mock wxt/browser so content.ts can be imported without side effects
mock.module("wxt/browser", () => ({
  browser: {},
}));

// Stub WXT auto-import — prevent defineContentScript from registering listeners
(globalThis as unknown as Record<string, unknown>).defineContentScript = (config: {
  matches: string[];
  main: () => void;
}) => {
  return config;
};

// Dynamic import AFTER mocks are in place
const { isElementFillable, fillSelect, handleFrameworkDropdown, fillAllInputs, fillInput, fillCheckboxOrRadio } = (await import(
  "../../src/entrypoints/content.ts"
)) as {
  isElementFillable: typeof import("../../src/entrypoints/content.ts").isElementFillable;
  fillSelect: typeof import("../../src/entrypoints/content.ts").fillSelect;
  handleFrameworkDropdown: typeof import("../../src/entrypoints/content.ts").handleFrameworkDropdown;
  fillAllInputs: typeof import("../../src/entrypoints/content.ts").fillAllInputs;
  fillInput: typeof import("../../src/entrypoints/content.ts").fillInput;
  fillCheckboxOrRadio: typeof import("../../src/entrypoints/content.ts").fillCheckboxOrRadio;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSelect(options: { value: string; text: string }[], attrs: string = ""): HTMLSelectElement {
  const select = document.createElement("select");
  if (attrs) {
    // Parse simple attributes like disabled, multiple
    const match = attrs.match(/(\w+)(?:="([^"]*)")?/g);
    if (match) {
      match.forEach((attr) => {
        const [name, val] = attr.split("=");
        select.setAttribute(name, val?.replace(/"/g, "") ?? "");
      });
    }
  }
  select.innerHTML = options
    .map((o) => `<option value="${o.value}">${o.text}</option>`)
    .join("");
  return select;
}

// ---------------------------------------------------------------------------
// isElementFillable — centralized guard for disabled/readonly elements
// ---------------------------------------------------------------------------
describe("isElementFillable", () => {
  // --- True cases (fillable) ---

  it("returns true for a normal text input", () => {
    const input = document.createElement("input");
    input.type = "text";
    expect(isElementFillable(input)).toBe(true);
  });

  it("returns true for a normal textarea", () => {
    const textarea = document.createElement("textarea");
    expect(isElementFillable(textarea)).toBe(true);
  });

  it("returns true for a normal select", () => {
    const select = document.createElement("select");
    expect(isElementFillable(select)).toBe(true);
  });

  it("returns true for a normal div (non-form element)", () => {
    const div = document.createElement("div");
    expect(isElementFillable(div)).toBe(true);
  });

  // --- Disabled cases ---

  it("returns false for a disabled input (attribute)", () => {
    const input = document.createElement("input");
    input.setAttribute("disabled", "");
    expect(isElementFillable(input)).toBe(false);
  });

  it("returns false for a disabled textarea (attribute)", () => {
    const textarea = document.createElement("textarea");
    textarea.setAttribute("disabled", "");
    expect(isElementFillable(textarea)).toBe(false);
  });

  it("returns false for a disabled select (attribute)", () => {
    const select = document.createElement("select");
    select.setAttribute("disabled", "");
    expect(isElementFillable(select)).toBe(false);
  });

  // --- Readonly cases ---

  it("returns false for a readonly input (attribute)", () => {
    const input = document.createElement("input");
    input.setAttribute("readonly", "");
    expect(isElementFillable(input)).toBe(false);
  });

  it("returns false for a readonly textarea (attribute)", () => {
    const textarea = document.createElement("textarea");
    textarea.setAttribute("readonly", "");
    expect(isElementFillable(textarea)).toBe(false);
  });

  // --- fieldset[disabled] case ---

  it("returns false for an input inside a fieldset[disabled]", () => {
    const fieldset = document.createElement("fieldset");
    fieldset.setAttribute("disabled", "");
    const input = document.createElement("input");
    fieldset.appendChild(input);
    // :disabled pseudo-class for fieldset descendants requires the
    // element tree to be connected to the document
    document.body.appendChild(fieldset);
    expect(isElementFillable(input)).toBe(false);
    document.body.removeChild(fieldset);
  });

  // --- Dynamically-set via JS property (no attribute) ---

  it("returns false for an input dynamically disabled via JS property", () => {
    const input = document.createElement("input");
    input.disabled = true; // property only, no attribute
    expect(isElementFillable(input)).toBe(false);
  });

  it("returns false for an input dynamically set readonly via JS property", () => {
    const input = document.createElement("input");
    input.readOnly = true; // property only, no attribute
    expect(isElementFillable(input)).toBe(false);
  });

  // --- Select ignores readOnly ---

  it("returns true for a select with readonly attribute (select has no readOnly)", () => {
    const select = document.createElement("select");
    select.setAttribute("readonly", "");
    // SELECT elements do not have a readOnly property — the guard skips the check
    expect(isElementFillable(select)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fillInput — guard behaviors for disabled/readonly elements
// ---------------------------------------------------------------------------
describe("fillInput — disabled/readonly guards (T2)", () => {
  it("does NOT set value on disabled input", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("disabled", "");
    fillInput(input, "should-not-appear");
    expect(input.value).toBe("");
  });

  it("does NOT set value on readonly input (attribute)", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("readonly", "");
    fillInput(input, "should-not-appear");
    expect(input.value).toBe("");
  });

  it("does NOT set value on programmatically readonly input (no attribute)", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    fillInput(input, "should-not-appear");
    expect(input.value).toBe("");
  });

  it("does NOT set value on input inside fieldset[disabled]", () => {
    const fieldset = document.createElement("fieldset");
    fieldset.setAttribute("disabled", "");
    const input = document.createElement("input");
    input.type = "text";
    fieldset.appendChild(input);
    document.body.appendChild(fieldset);
    fillInput(input, "should-not-appear");
    expect(input.value).toBe("");
    document.body.removeChild(fieldset);
  });

  it("STILL sets value on a normal input (regression check)", () => {
    const input = document.createElement("input");
    input.type = "text";
    fillInput(input, "hello");
    expect(input.value).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// fillCheckboxOrRadio — guard behaviors for disabled elements
// ---------------------------------------------------------------------------
describe("fillCheckboxOrRadio — disabled guard (T2)", () => {
  it("does NOT check a disabled radio", () => {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "test";
    input.setAttribute("disabled", "");
    fillCheckboxOrRadio(input, true);
    expect(input.checked).toBe(false);
  });

  it("does NOT check a radio inside fieldset[disabled]", () => {
    const fieldset = document.createElement("fieldset");
    fieldset.setAttribute("disabled", "");
    const input = document.createElement("input");
    input.type = "radio";
    fieldset.appendChild(input);
    document.body.appendChild(fieldset);
    fillCheckboxOrRadio(input, true);
    expect(input.checked).toBe(false);
    document.body.removeChild(fieldset);
  });

  it("STILL checks a normal enabled radio (regression check)", () => {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "test";
    fillCheckboxOrRadio(input, true);
    expect(input.checked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// APPROVAL TESTS for T3: fillDocument extraction from fillAllInputs
// These capture current behavior before the refactor.
// ---------------------------------------------------------------------------
import { detectPageLocale } from "../../src/lib/locales";

describe("fillAllInputs — approval tests (pre-extraction)", () => {
  function makeForm(html: string): HTMLFormElement {
    const form = document.createElement("form");
    form.innerHTML = html;
    document.body.appendChild(form);
    return form;
  }

  function cleanup(form: HTMLFormElement) {
    document.body.removeChild(form);
  }

  it("fills text inputs with matching config", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <input name="firstName" />
    `);
    const email = form.querySelector<HTMLInputElement>('[name="email"]')!;
    const firstName = form.querySelector<HTMLInputElement>('[name="firstName"]')!;

    const config = {
      email: { enabled: true, probability: 100, customValues: [{ value: "a@b.com", weight: 100 }] },
      firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
    };
    fillAllInputs(config);

    expect(email.value).toBe("a@b.com");
    expect(firstName.value).toBe("Alice");
    cleanup(form);
  });

  it("fills native selects with matching option text", () => {
    const form = makeForm(`
      <select name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;
    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
    };
    fillAllInputs(config);
    expect(select.value).toBe("us");
    cleanup(form);
  });

  it("fills textarea with matching config (text fieldType)", () => {
    const form = makeForm(`<textarea name="notes"></textarea>`);
    const textarea = form.querySelector<HTMLTextAreaElement>("textarea")!;
    fillAllInputs({ text: { enabled: true, probability: 100, customValues: [{ value: "some notes", weight: 100 }] } });
    expect(textarea.value).toBe("some notes");
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// APPROVAL TESTS for T5: getAccessibleFrameDocs
// ---------------------------------------------------------------------------
const { fillDocument, countFillableInDocument, getAccessibleFrameDocs } = (await import(
  "../../src/entrypoints/content.ts"
)) as {
  fillDocument: typeof import("../../src/entrypoints/content.ts").fillDocument;
  countFillableInDocument: typeof import("../../src/entrypoints/content.ts").countFillableInDocument;
  getAccessibleFrameDocs: typeof import("../../src/entrypoints/content.ts").getAccessibleFrameDocs;
};

describe("getAccessibleFrameDocs", () => {
  it("returns empty array when document has no iframes", () => {
    document.body.innerHTML = "<div>no iframes</div>";
    const result = getAccessibleFrameDocs(document);
    expect(result).toEqual([]);
  });

  it("returns empty array when no iframes present", () => {
    const container = document.createElement("div");
    container.innerHTML = '<span>no iframe here</span>';
    const result = getAccessibleFrameDocs(document);
    expect(result).toEqual([]);
  });

  it("catches cross-origin errors silently", () => {
    document.body.innerHTML = "";
    const result = getAccessibleFrameDocs(document);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Task 8: fillSelect unit tests
// ---------------------------------------------------------------------------
describe("fillSelect", () => {
  // REQ-5: Guards — return false
  describe("guards (REQ-5)", () => {
    it("returns false when select is disabled", () => {
      const select = makeSelect(
        [{ value: "us", text: "United States" }],
        "disabled",
      );
      expect(fillSelect(select, "us")).toBe(false);
    });

    it("returns false when select has [multiple]", () => {
      const select = makeSelect(
        [{ value: "us", text: "United States" }],
        "multiple",
      );
      expect(fillSelect(select, "us")).toBe(false);
    });

    it("returns false when select has zero options", () => {
      const select = makeSelect([]);
      expect(fillSelect(select, "us")).toBe(false);
    });
  });

  // REQ-4, REQ-9: Option matching — case-insensitive partial substring
  describe("option matching (REQ-4, REQ-9)", () => {
    it("matches by option.text (case-insensitive)", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
        { value: "ca", text: "Canada" },
      ]);
      expect(fillSelect(select, "canada")).toBe(true);
      expect(select.value).toBe("ca");
    });

    it("matches by option.value (case-insensitive)", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
        { value: "ca", text: "Canada" },
      ]);
      expect(fillSelect(select, "CA")).toBe(true);
      expect(select.value).toBe("ca");
    });

    it("partial substring match in option.text", () => {
      const select = makeSelect([
        { value: "us", text: "United States of America" },
        { value: "ca", text: "Canada" },
      ]);
      expect(fillSelect(select, "states")).toBe(true);
      expect(select.value).toBe("us");
    });

    it("partial substring match in option.value", () => {
      const select = makeSelect([
        { value: "united-states", text: "United States" },
        { value: "ca", text: "Canada" },
      ]);
      expect(fillSelect(select, "unit")).toBe(true);
      expect(select.value).toBe("united-states");
    });
  });

  // REQ-10: First matching option (DOM order) wins
  describe("first match wins (REQ-10)", () => {
    it("selects the first matching option in DOM order", () => {
      const select = makeSelect([
        { value: "us", text: "USA" },
        { value: "gb", text: "Great Britain" },
        { value: "fr", text: "France" },
      ]);
      // "a" appears in "USA" and "Great Britain" — first in DOM order wins
      expect(fillSelect(select, "a")).toBe(true);
      expect(select.value).toBe("us");
    });
  });

  // REQ-4: Events — dispatch input + change with bubbles: true
  describe("events (REQ-4)", () => {
    it("dispatches input event with bubbles: true", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
      ]);

      let inputEvent: Event | null = null;
      select.addEventListener("input", (e) => {
        inputEvent = e;
      });

      fillSelect(select, "us");
      expect(inputEvent).not.toBeNull();
      expect(inputEvent?.bubbles).toBe(true);
    });

    it("dispatches change event with bubbles: true", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
      ]);

      let changeEvent: Event | null = null;
      select.addEventListener("change", (e) => {
        changeEvent = e;
      });

      fillSelect(select, "us");
      expect(changeEvent).not.toBeNull();
      expect(changeEvent?.bubbles).toBe(true);
    });
  });

  // Return values
  describe("return values", () => {
    it("returns true on successful match", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
      ]);
      expect(fillSelect(select, "us")).toBe(true);
    });

    it("returns false when no option matches", () => {
      const select = makeSelect([
        { value: "us", text: "United States" },
      ]);
      expect(fillSelect(select, "nonexistent")).toBe(false);
    });
  });

  // Task 3.2: fillSelect() logging behavior
  describe("logging behavior (Task 3.2)", () => {
    it("logs debug when select is disabled", () => {
      const consoleDebug = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebug;

      const select = makeSelect(
        [{ value: "us", text: "United States" }],
        "disabled",
      );
      fillSelect(select, "us");

      expect(consoleDebug).toHaveBeenCalled();
      const firstCall = (consoleDebug as any).mock.calls[0];
      expect(firstCall[0]).toContain("Skipped disabled select");

      console.debug = originalDebug;
    });

    it("logs debug when select has multiple", () => {
      const consoleDebug = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebug;

      const select = makeSelect(
        [{ value: "us", text: "United States" }],
        "multiple",
      );
      fillSelect(select, "us");

      expect(consoleDebug).toHaveBeenCalled();
      const firstCall = (consoleDebug as any).mock.calls[0];
      expect(firstCall[0]).toContain("Skipped multiple select");

      console.debug = originalDebug;
    });

    it("logs debug when select has zero options", () => {
      const consoleDebug = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebug;

      const select = makeSelect([]);
      fillSelect(select, "us");

      expect(consoleDebug).toHaveBeenCalled();
      const firstCall = (consoleDebug as any).mock.calls[0];
      expect(firstCall[0]).toContain("Skipped select with zero options");

      console.debug = originalDebug;
    });

    it("logs warning when no matching option found", () => {
      const consoleWarn = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleWarn;

      const select = makeSelect([
        { value: "us", text: "United States" },
        { value: "ca", text: "Canada" },
      ]);
      fillSelect(select, "nonexistent");

      expect(consoleWarn).toHaveBeenCalled();
      const firstCall = (consoleWarn as any).mock.calls[0];
      expect(firstCall[0]).toContain("No matching option for 'nonexistent'");

      console.warn = originalWarn;
    });
  });

  // Task 3.5: Tests for fillAllInputs() summary stats
  describe("fillAllInputs summary stats (Task 3.5)", () => {
    it("should log summary stats after filling inputs", () => {
      const consoleDebug = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebug;

      // Create a form with selects
      document.body.innerHTML = `
        <form>
          <select name="country" autocomplete="country">
            <option value="us">United States</option>
            <option value="ca">Canada</option>
          </select>
          <input type="text" name="name" autocomplete="name" />
        </form>
      `;

      fillAllInputs({ country: { enabled: true, probability: 100, customValues: [] } });

      // Should log summary
      expect(consoleDebug).toHaveBeenCalled();
      const summaryCall = (consoleDebug as any).mock.calls.find(
        (call: any) => call[0]?.includes?.("fillAllInputs summary")
      );
      expect(summaryCall).toBeDefined();

      console.debug = originalDebug;

      // Clean up
      document.body.innerHTML = "";
    });

    it("should count framework dropdowns in stats", () => {
      const consoleDebug = mock(() => {});
      const originalDebug = console.debug;
      console.debug = consoleDebug;

      // Create a form with a framework dropdown
      document.body.innerHTML = `
        <form>
          <div class="vue-select" role="combobox" name="country">
            <li data-value="us">United States</li>
            <li data-value="ca">Canada</li>
          </div>
        </form>
      `;

      fillAllInputs({ country: { enabled: true, probability: 100, customValues: [] } });

      // Should log summary with framework dropdown count
      const summaryCall = (consoleDebug as any).mock.calls.find(
        (call: any) => call[0]?.includes?.("fillAllInputs summary")
      );
      expect(summaryCall).toBeDefined();

      console.debug = originalDebug;

      // Clean up
      document.body.innerHTML = "";
    });
  });
});
