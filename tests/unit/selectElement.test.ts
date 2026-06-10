import { describe, it, expect } from "bun:test";
import { detectSelectElementType, type SelectElementType } from "@/lib/fieldDetector";

// Task 1: Test that HTMLSelectElement value getter/setter works in happy-dom
// After patching the prototype
describe("HTMLSelectElement value handling in happy-dom", () => {
  it("should allow setting and getting value on select elements", () => {
    const select = document.createElement("select");
    select.innerHTML = `
      <option value="us">United States</option>
      <option value="ca">Canada</option>
    `;

    select.value = "ca";
    expect(select.value).toBe("ca");
  });

  it("should allow reading value after setting it via property", () => {
    const select = document.createElement("select");
    select.innerHTML = `<option value="test">Test</option>`;

    select.value = "test";
    expect(select.value).toBe("test");
  });
});

// Task 3.1: Tests for detectSelectElementType() detection
describe("detectSelectElementType", () => {
  it("should return 'native-select' for HTMLSelectElement", () => {
    const select = document.createElement("select");
    expect(detectSelectElementType(select)).toBe("native-select");
  });

  it("should return 'vue-dropdown' for element with data-v- attribute", () => {
    const div = document.createElement("div");
    div.setAttribute("data-v-123abc", "");
    div.innerHTML = '<ul><li data-value="us">United States</li></ul>';
    expect(detectSelectElementType(div)).toBe("vue-dropdown");
  });

  it("should NOT return 'vue-dropdown' for an INPUT with only data-v- (no combobox role)", () => {
    const input = document.createElement("input");
    input.setAttribute("data-v-c97e8b8c", "");
    input.setAttribute("id", "name");
    input.setAttribute("type", "text");
    // Plain Vue-rendered input — NOT a dropdown
    expect(detectSelectElementType(input)).toBeNull();
  });

  it("should return 'vue-dropdown' for an INPUT with data-v- AND role=combobox", () => {
    const input = document.createElement("input");
    input.setAttribute("data-v-123abc", "");
    input.setAttribute("role", "combobox");
    expect(detectSelectElementType(input)).toBe("vue-dropdown");
  });

  it("should NOT return 'vue-dropdown' for a TEXTAREA with only data-v-", () => {
    const textarea = document.createElement("textarea");
    textarea.setAttribute("data-v-123abc", "");
    expect(detectSelectElementType(textarea)).toBeNull();
  });

  it("should return 'vue-dropdown' for element with vue-select class", () => {
    const div = document.createElement("div");
    div.className = "vue-select";
    expect(detectSelectElementType(div)).toBe("vue-dropdown");
  });

  it("should return 'react-dropdown' for element with data-reactroot", () => {
    const div = document.createElement("div");
    div.setAttribute("data-reactroot", "");
    expect(detectSelectElementType(div)).toBe("react-dropdown");
  });

  it("should return 'react-dropdown' for element with react-select class", () => {
    const div = document.createElement("div");
    div.className = "react-select";
    expect(detectSelectElementType(div)).toBe("react-dropdown");
  });

  it("should return 'react-dropdown' for element with role='combobox' and no framework indicators", () => {
    const div = document.createElement("div");
    div.setAttribute("role", "combobox");
    // react-select is the dominant library using role="combobox"; default to react-dropdown
    expect(detectSelectElementType(div)).toBe("react-dropdown");
  });

  it("should return null for regular div with no dropdown indicators", () => {
    const div = document.createElement("div");
    expect(detectSelectElementType(div)).toBeNull();
  });
});
