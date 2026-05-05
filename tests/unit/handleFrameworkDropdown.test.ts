import { describe, it, expect, mock, beforeAll } from "bun:test";
import type { SelectElementType } from "@/lib/fieldDetector";

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
const { handleFrameworkDropdown } = (await import(
  "../../src/entrypoints/content.ts"
)) as {
  handleFrameworkDropdown: typeof import("../../src/entrypoints/content.ts").handleFrameworkDropdown;
};

describe("handleFrameworkDropdown", () => {
  // Task 3.4: Tests for handleFrameworkDropdown() simulation

  it("should return false when validation fails (no matching options)", () => {
    const div = document.createElement("div");
    // Empty dropdown - no options
    div.innerHTML = `<ul></ul>`;

    const result = handleFrameworkDropdown(div, "United States", "vue-dropdown" as SelectElementType);
    expect(result).toBe(false);
  });

  it("should return true optimistically when there are options", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <ul>
        <li data-value="us">United States</li>
      </ul>
    `;

    const result = handleFrameworkDropdown(div, "United States", "vue-dropdown" as SelectElementType);
    expect(result).toBe(true);
  });

  it("should return false when no matching option found", () => {
    const consoleWarn = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleWarn;

    const div = document.createElement("div");
    div.innerHTML = `
      <li data-value="us">United States</li>
      <li data-value="ca">Canada</li>
    `;

    const result = handleFrameworkDropdown(div, "France", "vue-dropdown" as SelectElementType);

    // Should return false because validation fails
    expect(result).toBe(false);

    console.warn = originalWarn;
  });
});
