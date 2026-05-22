import { describe, it, expect, beforeAll, mock } from "bun:test";
import type { PreviewEntry } from "../../src/lib/types";

// Mock wxt/browser so content.ts can be imported without side effects
mock.module("wxt/browser", () => ({
  browser: {},
}));

// Stub WXT auto-import
(globalThis as unknown as Record<string, unknown>).defineContentScript = (config: {
  matches: string[];
  main: () => void;
}) => {
  return config;
};

// Helper: create a minimal form with given HTML
function makeForm(html: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.appendChild(form);
  return form;
}

function cleanup(form: HTMLFormElement) {
  document.body.removeChild(form);
}

function toRecord(entries: PreviewEntry[]): Record<string, PreviewEntry> {
  const rec: Record<string, PreviewEntry> = {};
  for (const e of entries) {
    rec[e.id] = e;
  }
  return rec;
}

// ---------------------------------------------------------------------------
// Tests for computeFieldValues()
// ---------------------------------------------------------------------------
describe("computeFieldValues()", () => {
  let computeFieldValues: (
    doc: Document,
    config: Record<string, unknown>,
    locale: string,
  ) => PreviewEntry[];

  beforeAll(async () => {
    const mod = await import("../../src/entrypoints/content.ts") as {
      computeFieldValues: typeof computeFieldValues;
    };
    computeFieldValues = mod.computeFieldValues;
  });

  it("returns PreviewEntry[] for a simple form with various fields", () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
      <input id="fname" name="firstName" autocomplete="given-name" />
      <input id="city" name="city" autocomplete="address-level2" />
    `);
    const config = {
      email: { enabled: true, probability: 100, customValues: [] },
      firstName: { enabled: true, probability: 100, customValues: [] },
      city: { enabled: true, probability: 100, customValues: [] },
    };
    const entries = computeFieldValues(document, config, "en");

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBe(3);

    const byId = toRecord(entries);
    expect(byId["email"]).toBeDefined();
    expect(byId["email"].fieldType).toBe("email");
    expect(byId["email"].label).toBeDefined();
    expect(byId["email"].groupType).toBe("single");

    expect(byId["fname"]).toBeDefined();
    expect(byId["fname"].fieldType).toBe("firstName");
    expect(byId["fname"].groupType).toBe("single");

    expect(byId["city"]).toBeDefined();
    expect(byId["city"].fieldType).toBe("city");

    expect(byId["email"].value).toBeTruthy();
    expect(typeof byId["email"].value).toBe("string");

    cleanup(form);
  });

  it("excludes hidden, submit, button, file, radio, checkbox input types", () => {
    const form = makeForm(`
      <input type="hidden" name="csrf" />
      <input type="submit" />
      <input type="button" />
      <input type="file" />
      <input type="radio" name="gender" value="m" />
      <input type="checkbox" name="hobbies" value="a" />
      <input id="email" name="email" type="email" autocomplete="email" />
    `);
    const config = {
      email: { enabled: true, probability: 100, customValues: [] },
    };
    const entries = computeFieldValues(document, config, "en");

    // Only the email input should produce an entry
    expect(entries.length).toBe(1);
    expect(entries[0].fieldType).toBe("email");
    expect(entries[0].id).toBe("email");

    cleanup(form);
  });

  it("returns empty array for a document with no fillable fields", () => {
    document.body.innerHTML = "<div>no forms here</div>";
    const entries = computeFieldValues(document, {}, "en");
    expect(entries).toEqual([]);
    document.body.innerHTML = "";
  });

  it("does NOT mutate DOM (no values set on inputs)", () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
      <input id="fname" name="firstName" autocomplete="given-name" />
    `);
    const emailInput = form.querySelector<HTMLInputElement>("#email")!;
    const fnameInput = form.querySelector<HTMLInputElement>("#fname")!;

    const config = {
      email: { enabled: true, probability: 100, customValues: [{ value: "a@b.com", weight: 100 }] },
      firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
    };
    const entries = computeFieldValues(document, config, "en");

    // DOM values MUST remain unchanged
    expect(emailInput.value).toBe("");
    expect(fnameInput.value).toBe("");

    // But the returned entries DO have the values
    const byId = toRecord(entries);
    expect(byId["email"].value).toBe("a@b.com");
    expect(byId["fname"].value).toBe("Alice");

    cleanup(form);
  });

  it("includes select elements", () => {
    const form = makeForm(`
      <select id="country" name="country" autocomplete="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);
    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
    };
    const entries = computeFieldValues(document, config, "en");

    expect(entries.length).toBe(1);
    expect(entries[0].fieldType).toBe("country");
    expect(entries[0].value).toBe("United States");

    cleanup(form);
  });

  it("includes textarea elements", () => {
    const form = makeForm(`<textarea id="notes" name="notes"></textarea>`);
    const config = {
      text: { enabled: true, probability: 100, customValues: [{ value: "some text", weight: 100 }] },
    };
    const entries = computeFieldValues(document, config, "en");

    expect(entries.length).toBe(1);
    expect(entries[0].fieldType).toBe("text");
    expect(entries[0].value).toBe("some text");

    cleanup(form);
  });

  it("generates values using faker when no custom values are provided", () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
    `);
    const config = {
      email: { enabled: true, probability: 100, customValues: [] },
    };
    const entries = computeFieldValues(document, config, "en");

    expect(entries.length).toBe(1);
    expect(entries[0].value).toBeTruthy();
    expect(typeof entries[0].value).toBe("string");
    expect(entries[0].value?.includes("@")).toBe(true);

    cleanup(form);
  });

  it("returns entries for each field detectably present on the page", () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
      <select id="country" name="country" autocomplete="country">
        <option value="us">US</option>
      </select>
      <input id="fname" name="firstName" autocomplete="given-name" />
      <input id="phone" type="tel" autocomplete="tel" />
    `);
    const config = {
      email: { enabled: true, probability: 100, customValues: [] },
      country: { enabled: true, probability: 100, customValues: [] },
      firstName: { enabled: true, probability: 100, customValues: [] },
      phone: { enabled: true, probability: 100, customValues: [] },
    };
    const entries = computeFieldValues(document, config, "en");

    const byId = toRecord(entries);
    expect(Object.keys(byId).length).toBe(4);
    expect(byId["email"].fieldType).toBe("email");
    expect(byId["country"].fieldType).toBe("country");
    expect(byId["fname"].fieldType).toBe("firstName");
    expect(byId["phone"].fieldType).toBe("phone");

    cleanup(form);
  });
});
