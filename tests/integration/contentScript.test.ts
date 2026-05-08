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
    const config = { email: { enabled: true, probability: 100, customValues: ["test@test.com"] } };
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

    const config = { text: { enabled: true, probability: 100, customValues: ["hello world"] } };
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
      const config = { text: { enabled: true, probability: 100, customValues: ["should-not-appear"] } };
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

    const config = { username: { enabled: true, probability: 100, customValues: ["johndoe"] } };
    for (const listener of messageListeners) {
      listener({ type: "FILL_FORM", config });
    }

    expect(input.value).toBe("johndoe");
    cleanup(form);
  });

  it("DOES fill a password input", () => {
    const form = makeForm('<input type="password" name="password" />');
    const input = form.querySelector<HTMLInputElement>("input")!;

    const config = { password: { enabled: true, probability: 100, customValues: ["s3cr3t!"] } };
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
      email: { enabled: true, probability: 100, customValues: ["a@b.com"] },
      firstName: { enabled: true, probability: 100, customValues: ["Alice"] },
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
      country: { enabled: true, probability: 100, customValues: ["United States"] },
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
      country: { enabled: true, probability: 100, customValues: ["ca"] },
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
      country: { enabled: true, probability: 100, customValues: ["United States"] },
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
      country: { enabled: true, probability: 100, customValues: ["United States"] },
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
      email: { enabled: true, probability: 100, customValues: ["test@test.com"] },
      country: { enabled: true, probability: 100, customValues: ["Canada"] },
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
          email: { enabled: true, probability: 100, customValues: ["stored@example.com"] },
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
          firstName: { enabled: true, probability: 100, customValues: ["LocalName"] },
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
      email: { enabled: true, probability: 100, customValues: ["test@example.com"] },
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
