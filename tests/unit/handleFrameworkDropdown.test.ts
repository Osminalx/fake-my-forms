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
  it("should return true optimistically when element is enabled", () => {
    const div = document.createElement("div");
    div.innerHTML = `<ul><li role="option">United States</li></ul>`;

    const result = handleFrameworkDropdown(div, "United States", "vue-dropdown" as SelectElementType);
    expect(result).toBe(true);
  });

  it("should return true optimistically even when no options will be found (async failure)", () => {
    const div = document.createElement("div");
    // No options — async part will warn and press Escape, but sync return is still true
    div.innerHTML = `<ul></ul>`;

    const result = handleFrameworkDropdown(div, "United States", "vue-dropdown" as SelectElementType);
    expect(result).toBe(true);
  });

  it("should return false when element has disabled attribute", () => {
    const input = document.createElement("input");
    input.setAttribute("disabled", "");

    const result = handleFrameworkDropdown(input, "United States", "react-dropdown" as SelectElementType);
    expect(result).toBe(false);
  });

  it("should return false when element has aria-disabled='true'", () => {
    const div = document.createElement("div");
    div.setAttribute("aria-disabled", "true");
    div.innerHTML = `<ul><li role="option">United States</li></ul>`;

    const result = handleFrameworkDropdown(div, "United States", "react-dropdown" as SelectElementType);
    expect(result).toBe(false);
  });

  it("should return false when ancestor has aria-disabled='true'", () => {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("aria-disabled", "true");
    const inner = document.createElement("input");
    wrapper.appendChild(inner);
    document.body.appendChild(wrapper);

    const result = handleFrameworkDropdown(inner, "Canada", "react-dropdown" as SelectElementType);
    expect(result).toBe(false);

    document.body.removeChild(wrapper);
  });
});
