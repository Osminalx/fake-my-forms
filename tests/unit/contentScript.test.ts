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
const { fillSelect, handleFrameworkDropdown, fillAllInputs } = (await import(
  "../../src/entrypoints/content.ts"
)) as {
  fillSelect: typeof import("../../src/entrypoints/content.ts").fillSelect;
  handleFrameworkDropdown: typeof import("../../src/entrypoints/content.ts").handleFrameworkDropdown;
  fillAllInputs: typeof import("../../src/entrypoints/content.ts").fillAllInputs;
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
