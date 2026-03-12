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
await import("../../src/entrypoints/content.ts");

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
