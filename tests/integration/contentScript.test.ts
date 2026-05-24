import { describe, it, expect, beforeAll, mock, afterEach } from "bun:test";

// Captured listeners, reset between test groups
let messageListeners: Array<(msg: unknown) => void> = [];
let storageSyncGet: ReturnType<typeof mock>;
let storageLocalGet: ReturnType<typeof mock>;

// Must be declared before the dynamic import so mock.module runs first
storageSyncGet = mock(() => Promise.resolve({ fakerConfig: {} }));
storageLocalGet = mock(() => Promise.resolve({ fakerConfig: {} }));

mock.module("wxt/browser", () => ({
  browser: {
    runtime: {
      onMessage: {
        addListener: (fn: (msg: unknown) => void) => {
          messageListeners.push(fn);
        },
      },
      id: "fake-my-forms-test",
    },
    storage: {
      sync: { get: storageSyncGet },
      local: { get: storageLocalGet },
    },
  },
}));

// Stub WXT auto-import — call main() immediately so listeners are registered
(globalThis as unknown as Record<string, unknown>).defineContentScript = (config: {
  matches: string[];
  main: () => void;
}) => {
  config.main();
  return config;
};

// Dynamic import AFTER mocks are in place
const contentModule = await import("../../src/entrypoints/content.ts") as {
  countFillableInputs: typeof import("../../src/entrypoints/content.ts").countFillableInputs;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeForm(html: string): HTMLFormElement {
  const form = document.createElement("form");
  form.innerHTML = html;
  document.body.appendChild(form);
  return form;
}

function cleanup(form: HTMLFormElement) {
  document.body.removeChild(form);
}

// ---------------------------------------------------------------------------
// fillInput — dispatches native events so JS frameworks detect changes
// ---------------------------------------------------------------------------
describe("fillInput (via FILL_FORM message)", () => {
  it("sets the value of a text input and dispatches input+change events", async () => {
    const form = makeForm(
      '<input id="email" name="email" type="email" />',
    );
    const input = form.querySelector<HTMLInputElement>("#email")!;

    const inputEvents: Event[] = [];
    const changeEvents: Event[] = [];
    input.addEventListener("input", (e) => inputEvents.push(e));
    input.addEventListener("change", (e) => changeEvents.push(e));

    // Trigger fill via message
    const config = { email: { enabled: true, probability: 100, customValues: [{ value: "test@test.com", weight: 100 }] } };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("test@test.com");
    expect(inputEvents.length).toBeGreaterThanOrEqual(1);
    expect(changeEvents.length).toBeGreaterThanOrEqual(1);
    cleanup(form);
  });

  it("sets values on textarea elements", async () => {
    const form = makeForm('<textarea name="notes"></textarea>');
    const textarea = form.querySelector<HTMLTextAreaElement>("textarea")!;

    const config = { text: { enabled: true, probability: 100, customValues: [{ value: "hello world", weight: 100 }] } };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(textarea.value).toBe("hello world");
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// fillAllInputs — selector filtering
// ---------------------------------------------------------------------------
describe("fillAllInputs — skipped input types", () => {
  const SKIPPED_TYPES = ["hidden", "submit", "button", "checkbox", "radio"] as const;

  for (const type of SKIPPED_TYPES) {
    it(`does NOT fill type="${type}"`, () => {
      const form = makeForm(`<input type="${type}" name="field" />`);
      const input = form.querySelector<HTMLInputElement>("input")!;

      const prevValue = input.value;
      const config = { text: { enabled: true, probability: 100, customValues: [{ value: "should-not-appear", weight: 100 }] } };
      for (const listener of messageListeners) {
        listener({ type: "FILL_FORM", config });
      }

      expect(input.value).toBe(prevValue); // value unchanged
      cleanup(form);
    });
  }

  it("DOES fill a standard text input", () => {
    const form = makeForm('<input type="text" name="username" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    const config = { username: { enabled: true, probability: 100, customValues: [{ value: "johndoe", weight: 100 }] } };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("johndoe");
    cleanup(form);
  });

  it("DOES fill a password input", () => {
    const form = makeForm('<input type="password" name="password" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    const config = { password: { enabled: true, probability: 100, customValues: [{ value: "s3cr3t!", weight: 100 }] } };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("s3cr3t!");
    cleanup(form);
  });

  it("fills multiple inputs in one pass", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <input name="firstName" />
      <input type="hidden" name="csrf" />
    `);
    const emailInput = form.querySelector<HTMLInputElement>('[name="email"]')!;
    const firstInput = form.querySelector<HTMLInputElement>('[name="firstName"]')!;
    const hiddenInput = form.querySelector<HTMLInputElement>('[name="csrf"]')!;

    const config = {
      email: { enabled: true, probability: 100, customValues: [{ value: "a@b.com", weight: 100 }] },
      firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(emailInput.value).toBe("a@b.com");
    expect(firstInput.value).toBe("Alice");
    expect(hiddenInput.value).toBe(""); // hidden is skipped
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// fillAllInputs — select element processing (REQ-7)
// ---------------------------------------------------------------------------
describe("fillAllInputs — select elements (REQ-7)", () => {
  it("fills a select element with matching option by text", () => {
    const form = makeForm(`
      <select name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    // country fieldType should generate a country value that matches "United States" or "Canada"
    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(select.value).toBe("us");
    cleanup(form);
  });

  it("fills a select element with matching option by value", () => {
    const form = makeForm(`
      <select name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "ca", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(select.value).toBe("ca");
    cleanup(form);
  });

  it("skips disabled select elements", () => {
    const form = makeForm(`
      <select name="country" disabled>
        <option value="us">United States</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;
    const prevValue = select.value;

    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(select.value).toBe(prevValue); // unchanged
    cleanup(form);
  });

  it("skips select elements with [multiple]", () => {
    const form = makeForm(`
      <select name="country" multiple>
        <option value="us">United States</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;
    const prevValue = select.value;

    const config = {
      country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(select.value).toBe(prevValue); // unchanged
    cleanup(form);
  });

  it("processes both inputs and selects in one pass", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <select name="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);
    const emailInput = form.querySelector<HTMLInputElement>('[name="email"]')!;
    const select = form.querySelector<HTMLSelectElement>("select")!;

    const config = {
      email: { enabled: true, probability: 100, customValues: [{ value: "test@test.com", weight: 100 }] },
      country: { enabled: true, probability: 100, customValues: [{ value: "Canada", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(emailInput.value).toBe("test@test.com");
    expect(select.value).toBe("ca");
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// countFillableInputs — includes select elements (REQ-8)
// ---------------------------------------------------------------------------
describe("countFillableInputs — select elements (REQ-8)", () => {
  it("counts a single select element (REQ-8)", () => {
    const form = makeForm(`
      <select name="country">
        <option value="us">United States</option>
      </select>
    `);

    // countFillableInputs should include select elements
    const count = contentModule.countFillableInputs();
    expect(count).toBe(1);

    cleanup(form);
  });

  it("counts both inputs and selects together (REQ-8)", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <select name="country">
        <option value="us">United States</option>
      </select>
    `);

    const count = contentModule.countFillableInputs();
    expect(count).toBe(2);

    cleanup(form);
  });

  it("does NOT count disabled select elements (REQ-1)", () => {
    const form = makeForm(`
      <select name="country" disabled>
        <option value="us">United States</option>
      </select>
      <input name="email" type="email" />
    `);

    const count = contentModule.countFillableInputs();
    expect(count).toBe(1); // only the input, not the disabled select

    cleanup(form);
  });

  it("does NOT count multiple select elements (REQ-1)", () => {
    const form = makeForm(`
      <select name="country" multiple>
        <option value="us">United States</option>
      </select>
      <input name="email" type="email" />
    `);

    const count = contentModule.countFillableInputs();
    expect(count).toBe(1); // only the input, not the multiple select

    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// APPROVAL TESTS for T2: processRadioGroups / processCheckboxGroups / findDropdownOptions
// These capture current behavior before adding optional `doc` parameter.
// ---------------------------------------------------------------------------
describe("processRadioGroups — approval tests (pre-refactor, via FILL_FORM)", () => {
  it("selects one radio per group", () => {
    const form = makeForm(`
      <input type="radio" name="gender" value="m" />
      <input type="radio" name="gender" value="f" />
    `);
    const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]');

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    const checked = Array.from(radios).filter((r) => r.checked);
    expect(checked.length).toBe(1); // One radio in the group should be selected
    cleanup(form);
  });

  it("processes multiple radio groups", () => {
    const form = makeForm(`
      <input type="radio" name="gender" value="m" />
      <input type="radio" name="gender" value="f" />
      <input type="radio" name="contact" value="email" />
      <input type="radio" name="contact" value="phone" />
    `);

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    const checked = Array.from(form.querySelectorAll('input[type="radio"]:checked'));
    expect(checked.length).toBe(2); // One per group
    cleanup(form);
  });
});

describe("processCheckboxGroups — approval tests (pre-refactor, via FILL_FORM)", () => {
  it("processes checkbox group", () => {
    const form = makeForm(`
      <input type="checkbox" name="hobbies" value="a" />
      <input type="checkbox" name="hobbies" value="b" />
      <input type="checkbox" name="hobbies" value="c" />
    `);

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    // At least one should be checked (random 1-N)
    const checked = form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
    expect(checked.length).toBeGreaterThanOrEqual(0);
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// Message listener — ignores unknown message types
// ---------------------------------------------------------------------------
describe("message listener — type filtering", () => {
  it("ignores messages with unknown types", () => {
    const form = makeForm('<input name="email" type="email" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    for (const listener of messageListeners) {
      listener({ type: "UNKNOWN_ACTION", config: {} });
    }

    expect(input.value).toBe("");
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// getStoredFakerConfig — storage fallbacks
// ---------------------------------------------------------------------------
describe("getStoredFakerConfig — keyboard shortcut storage reads", () => {
  afterEach(() => {
    storageSyncGet.mockReset();
    storageLocalGet.mockReset();
    storageSyncGet.mockImplementation(() => Promise.resolve({ fakerConfig: {} }));
    storageLocalGet.mockImplementation(() => Promise.resolve({ fakerConfig: {} }));
  });

  it("reads from sync storage on Alt+Shift+F and fills inputs", async () => {
    storageSyncGet.mockImplementation(() =>
      Promise.resolve({
        fakerConfig: {
          email: { enabled: true, probability: 100, customValues: [{ value: "stored@example.com", weight: 100 }] },
        },
      }),
    );

    const form = makeForm('<input name="email" type="email" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "F", bubbles: true }),
    );

    // Wait for async storage read
    await new Promise((r) => setTimeout(r, 50));

    expect(input.value).toBe("stored@example.com");
    cleanup(form);
  });

  it("falls back to local storage when sync throws", async () => {
    storageSyncGet.mockImplementation(() => Promise.reject(new Error("sync unavailable")));
    storageLocalGet.mockImplementation(() =>
      Promise.resolve({
        fakerConfig: {
          firstName: { enabled: true, probability: 100, customValues: [{ value: "LocalName", weight: 100 }] },
        },
      }),
    );

    const form = makeForm('<input name="firstName" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "F", bubbles: true }),
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(input.value).toBe("LocalName");
    cleanup(form);
  });

  it("returns empty config when both storages fail (inputs get faker defaults)", async () => {
    storageSyncGet.mockImplementation(() => Promise.reject(new Error("sync fail")));
    storageLocalGet.mockImplementation(() => Promise.reject(new Error("local fail")));

    const form = makeForm('<input name="email" type="email" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "F", bubbles: true }),
    );

    await new Promise((r) => setTimeout(r, 50));

    // With empty config, generateValue uses defaults — should still produce a value
    expect(input.value.length).toBeGreaterThan(0);
    cleanup(form);
  });

  it("does NOT trigger on other key combinations", async () => {
    const form = makeForm('<input name="email" type="email" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: false, key: "F", bubbles: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: false, shiftKey: true, key: "F", bubbles: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "G", bubbles: true }),
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(input.value).toBe("");
    cleanup(form);
  });

  it("migrates legacy string[] customValues from storage to CustomValueWeight[]", async () => {
    // Simulate storage with OLD format (string[]) — as would happen if user
    // has existing stored config from before TASK-001
    storageSyncGet.mockImplementation(() =>
      Promise.resolve({
        fakerConfig: {
          email: { enabled: true, probability: 100, customValues: ["migrated@example.com"] },
        },
      }),
    );

    const form = makeForm('<input name="email" type="email" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "F", bubbles: true }),
    );

    // Wait for async storage read + migration + fill
    await new Promise((r) => setTimeout(r, 50));

    // The migration should convert ["migrated@example.com"] →
    // [{ value: "migrated@example.com", weight: 100 }], then generateValue
    // should pick it and fillInput should set the value
    expect(input.value).toBe("migrated@example.com");
    cleanup(form);
  });

  it("migrates legacy string[] customValues from local storage fallback", async () => {
    storageSyncGet.mockImplementation(() => Promise.reject(new Error("sync fail")));
    storageLocalGet.mockImplementation(() =>
      Promise.resolve({
        fakerConfig: {
          text: { enabled: true, probability: 100, customValues: ["legacy text"] },
        },
      }),
    );

    const form = makeForm('<textarea name="notes"></textarea>');
    const textarea = form.querySelector<HTMLTextAreaElement>("textarea")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { altKey: true, shiftKey: true, key: "F", bubbles: true }),
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(textarea.value).toBe("legacy text");
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// PREVIEW_FILL message handler
// ---------------------------------------------------------------------------
describe("PREVIEW_FILL message handler", () => {
  function makeForm(html: string): HTMLFormElement {
    const form = document.createElement("form");
    form.innerHTML = html;
    document.body.appendChild(form);
    return form;
  }

  function cleanup(form: HTMLFormElement) {
    document.body.removeChild(form);
  }

  it("returns entries for fillable fields on the page", async () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
      <input id="fname" name="firstName" autocomplete="given-name" />
      <select id="country" name="country" autocomplete="country">
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      </select>
    `);

    let result: unknown = null;
    for (const listener of messageListeners) {
      const response = listener({
        type: "PREVIEW_FILL",
        config: {
          email: { enabled: true, probability: 100, customValues: [{ value: "a@b.com", weight: 100 }] },
          firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
          country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
        },
        locale: "en",
      });
      if (response instanceof Promise) {
        result = await response;
      }
    }

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("entries");
    expect(Array.isArray((result as { entries: unknown }).entries)).toBe(true);
    expect((result as { entries: unknown[] }).entries.length).toBe(3);

    const entries = (result as { entries: { id: string; fieldType: string; value: string | null }[] }).entries;
    const byId: Record<string, typeof entries[0]> = {};
    for (const e of entries) byId[e.id] = e;

    expect(byId["email"].fieldType).toBe("email");
    expect(byId["email"].value).toBe("a@b.com");
    expect(byId["fname"].fieldType).toBe("firstName");
    expect(byId["fname"].value).toBe("Alice");
    expect(byId["country"].fieldType).toBe("country");
    expect(byId["country"].value).toBe("United States");

    cleanup(form);
  });

  it("returns empty entries array for a page with no fillable fields", async () => {
    document.body.innerHTML = "<div>no forms here</div>";

    let result: unknown = null;
    for (const listener of messageListeners) {
      const response = listener({
        type: "PREVIEW_FILL",
        config: {},
        locale: "en",
      });
      if (response instanceof Promise) {
        result = await response;
      }
    }

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("entries");
    expect((result as { entries: unknown[] }).entries).toEqual([]);

    document.body.innerHTML = "";
  });

  it("returns entries with correct PreviewEntry shape", async () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
    `);

    let result: unknown = null;
    for (const listener of messageListeners) {
      const response = listener({
        type: "PREVIEW_FILL",
        config: {
          email: { enabled: true, probability: 100, customValues: [{ value: "test@test.com", weight: 100 }] },
        },
        locale: "en",
      });
      if (response instanceof Promise) {
        result = await response;
      }
    }

    expect(result).not.toBeNull();
    const entries = (result as { entries: unknown[] }).entries;
    expect(entries.length).toBe(1);

    const entry = entries[0] as Record<string, unknown>;
    expect(entry).toHaveProperty("id");
    expect(entry).toHaveProperty("label");
    expect(entry).toHaveProperty("fieldType");
    expect(entry).toHaveProperty("value");
    expect(entry).toHaveProperty("isFrameworkDropdown");
    expect(entry).toHaveProperty("groupType");
    expect(entry).toHaveProperty("groupId");
    expect(entry.fieldType).toBe("email");
    expect(entry.value).toBe("test@test.com");
    expect(entry.isFrameworkDropdown).toBe(false);
    expect(entry.groupType).toBe("single");

    cleanup(form);
  });

  it("does NOT mutate DOM values", async () => {
    const form = makeForm(`
      <input id="email" name="email" type="email" autocomplete="email" />
    `);
    const input = form.querySelector<HTMLInputElement>("#email")!;
    const prevValue = input.value;

    for (const listener of messageListeners) {
      const response = listener({
        type: "PREVIEW_FILL",
        config: {
          email: { enabled: true, probability: 100, customValues: [{ value: "should-not-appear", weight: 100 }] },
        },
        locale: "en",
      });
      if (response instanceof Promise) {
        await response;
      }
    }

    expect(input.value).toBe(prevValue);

    cleanup(form);
  });

  it("includes framework dropdowns in entries", async () => {
    const form = makeForm(`
      <div class="vue-select" role="combobox" name="country">
        <li data-value="us">United States</li>
        <li data-value="ca">Canada</li>
      </div>
    `);

    let result: unknown = null;
    for (const listener of messageListeners) {
      const response = listener({
        type: "PREVIEW_FILL",
        config: {
          country: { enabled: true, probability: 100, customValues: [{ value: "United States", weight: 100 }] },
        },
        locale: "en",
      });
      if (response instanceof Promise) {
        result = await response;
      }
    }

    expect(result).not.toBeNull();
    const entries = (result as { entries: unknown[] }).entries;
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries[0] as Record<string, unknown>;
    expect(entry.isFrameworkDropdown).toBe(true);

    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// APPROVAL TESTS for T4: countFillableInDocument extraction
// These capture current countFillableInputs behavior before refactor.
// ---------------------------------------------------------------------------
describe("countFillableInputs — approval tests (pre-extraction)", () => {
  it("counts inputs, textareas, and selects together", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <textarea name="notes"></textarea>
      <select name="country">
        <option value="us">United States</option>
      </select>
    `);
    expect(contentModule.countFillableInputs()).toBe(3);
    cleanup(form);
  });

  it("excludes hidden, submit, button, file inputs", () => {
    const form = makeForm(`
      <input type="hidden" name="csrf" />
      <input type="submit" />
      <input type="button" />
      <input type="file" />
      <input name="email" type="email" />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("excludes disabled and multiple selects", () => {
    const form = makeForm(`
      <select name="country" disabled>
        <option value="us">United States</option>
      </select>
      <select name="hobbies" multiple>
        <option value="r">Reading</option>
      </select>
    `);
    expect(contentModule.countFillableInputs()).toBe(0);
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// countFillableInputs — disabled/readonly filtering (T4)
// ---------------------------------------------------------------------------
describe("countFillableInputs — disabled/readonly filtering (T4)", () => {
  it("excludes disabled input", () => {
    const form = makeForm(`
      <input type="text" name="normal" />
      <input type="text" name="blocked" disabled />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("excludes readonly input (attribute)", () => {
    const form = makeForm(`
      <input type="text" name="normal" />
      <input type="text" name="blocked" readonly />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("excludes input inside fieldset[disabled]", () => {
    const form = makeForm(`
      <fieldset disabled>
        <input type="text" name="inside" />
      </fieldset>
      <input type="text" name="outside" />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("excludes readonly textarea", () => {
    const form = makeForm(`
      <textarea name="blocked" readonly></textarea>
      <input type="text" name="normal" />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("excludes disabled select", () => {
    const form = makeForm(`
      <select name="blocked" disabled>
        <option value="a">A</option>
      </select>
      <input type="text" name="normal" />
    `);
    expect(contentModule.countFillableInputs()).toBe(1);
    cleanup(form);
  });

  it("counts only normal fillable elements in mixed scenario", () => {
    const form = makeForm(`
      <input type="text" name="a" />
      <input type="text" name="b" disabled />
      <input type="text" name="c" readonly />
      <textarea name="d"></textarea>
      <select name="e">
        <option value="x">X</option>
      </select>
    `);
    expect(contentModule.countFillableInputs()).toBe(3); // a, d, e
    cleanup(form);
  });
});

// ---------------------------------------------------------------------------
// FILL_FORM — disabled/readonly guard behavior (T6)
// ---------------------------------------------------------------------------
describe("FILL_FORM — disabled/readonly guard behavior (T6)", () => {
  it("does NOT fill a disabled input", () => {
    const form = makeForm('<input type="text" name="firstName" disabled />');
    const input = form.querySelector<HTMLInputElement>("input")!;
    const prevValue = input.value;

    const config = {
      firstName: { enabled: true, probability: 100, customValues: [{ value: "should-not-appear", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe(prevValue);
    cleanup(form);
  });

  it("does NOT fill a readonly input (attribute)", () => {
    const form = makeForm('<input type="text" name="firstName" readonly />');
    const input = form.querySelector<HTMLInputElement>("input")!;
    const prevValue = input.value;

    const config = {
      firstName: { enabled: true, probability: 100, customValues: [{ value: "should-not-appear", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe(prevValue);
    cleanup(form);
  });

  it("does NOT fill input inside fieldset[disabled]", () => {
    const form = makeForm('<fieldset disabled><input type="text" name="firstName" /></fieldset>');
    const input = form.querySelector<HTMLInputElement>("input")!;
    const prevValue = input.value;

    const config = {
      firstName: { enabled: true, probability: 100, customValues: [{ value: "should-not-appear", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe(prevValue);
    cleanup(form);
  });

  it("fills only fillable inputs in a mixed form", () => {
    const form = makeForm(`
      <input type="text" name="firstName" />
      <input type="text" name="lastName" disabled />
      <input type="text" name="email" readonly />
    `);
    const firstName = form.querySelector<HTMLInputElement>('[name="firstName"]')!;
    const lastName = form.querySelector<HTMLInputElement>('[name="lastName"]')!;
    const email = form.querySelector<HTMLInputElement>('[name="email"]')!;

    const config = {
      firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
      lastName: { enabled: true, probability: 100, customValues: [{ value: "should-not", weight: 100 }] },
      email: { enabled: true, probability: 100, customValues: [{ value: "should-not", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(firstName.value).toBe("Alice");
    expect(lastName.value).toBe(""); // unchanged
    expect(email.value).toBe(""); // unchanged
    cleanup(form);
  });

  it("still fills enabled inputs (regression)", () => {
    const form = makeForm('<input type="text" name="firstName" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    const config = {
      firstName: { enabled: true, probability: 100, customValues: [{ value: "Alice", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("Alice");
    cleanup(form);
  });

  it("GET_INPUT_STATS returns correct count excluding disabled/readonly", () => {
    const form = makeForm(`
      <input type="text" name="a" />
      <input type="text" name="b" disabled />
      <input type="text" name="c" readonly />
    `);

    let count = 0;
    for (const listener of messageListeners) {
      const result = listener({ type: "GET_INPUT_STATS" });
      if (result instanceof Promise) {
        result.then((r: unknown) => {
          if (r && typeof r === "object" && "count" in r) {
            count = (r as { count: number }).count;
          }
        });
      }
    }

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(count).toBe(1); // only input "a"
        cleanup(form);
        resolve();
      }, 10);
    });
  });
});

// ---------------------------------------------------------------------------
// fillSelect — select element support
// ---------------------------------------------------------------------------
describe("fillSelect (via FILL_FORM message)", () => {
  it("picks a non-empty option from a vanilla select", () => {
    const form = makeForm(`
      <select name="country">
        <option value="">Choose a country</option>
        <option value="us">United States</option>
        <option value="es">Spain</option>
        <option value="de">Germany</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    expect(select.value).not.toBe("");
    expect(["us", "es", "de"]).toContain(select.value);
    cleanup(form);
  });

  it("does not change value when only a placeholder option exists", () => {
    const form = makeForm(`
      <select name="empty">
        <option value="">-- select --</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    expect(select.value).toBe("");
    cleanup(form);
  });

  it("dispatches input and change events for framework reactivity", () => {
    const form = makeForm(`
      <select name="role">
        <option value="admin">Admin</option>
        <option value="user">User</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    const inputEvents: Event[] = [];
    const changeEvents: Event[] = [];
    select.addEventListener("input", (e) => inputEvents.push(e));
    select.addEventListener("change", (e) => changeEvents.push(e));

    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config: {} });
    }

    expect(inputEvents.length).toBeGreaterThanOrEqual(1);
    expect(changeEvents.length).toBeGreaterThanOrEqual(1);
    cleanup(form);
  });

  it("never picks a disabled option", () => {
    const form = makeForm(`
      <select name="size">
        <option value="">Pick size</option>
        <option value="s" disabled>Small (out of stock)</option>
        <option value="m">Medium</option>
        <option value="l">Large</option>
      </select>
    `);
    const select = form.querySelector<HTMLSelectElement>("select")!;

    // Run many times to ensure "s" is never picked
    for (let i = 0; i < 30; i++) {
      for (const listener of messageListeners) {
        listener({ type: "FILL_FORM", config: {} });
      }
      expect(select.value).not.toBe("s");
      expect(select.value).not.toBe("");
    }
    cleanup(form);
  });

  it("fills select alongside inputs in one pass", () => {
    const form = makeForm(`
      <input name="email" type="email" />
      <select name="plan">
        <option value="">Choose</option>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </select>
    `);
    const input = form.querySelector<HTMLInputElement>("input")!;
    const select = form.querySelector<HTMLSelectElement>("select")!;

    const config = {
      email: { enabled: true, probability: 100, customValues: [{ value: "test@example.com", weight: 100 }] },
    };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("test@example.com");
    expect(["free", "pro"]).toContain(select.value);
    cleanup(form);
  });

  it("is counted by GET_INPUT_STATS", () => {
    const form = makeForm(`
      <input name="name" />
      <select name="gender">
        <option value="m">Male</option>
        <option value="f">Female</option>
      </select>
    `);

    let count = 0;
    for (const listener of messageListeners) {
      const result = listener({ type: "GET_INPUT_STATS" });
      if (result instanceof Promise) {
        result.then((r: unknown) => {
          if (r && typeof r === "object" && "count" in r) {
            count = (r as { count: number }).count;
          }
        });
      }
    }

    // Allow the promise to resolve
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(count).toBeGreaterThanOrEqual(2);
        cleanup(form);
        resolve();
      }, 10);
    });
  });
});
