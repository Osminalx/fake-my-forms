import { describe, it, expect, mock, beforeAll } from "bun:test";
import { validateSelectValue } from "@/lib/fakerEngine";

// Mock wxt/browser so content.ts can be imported without side effects
mock.module("wxt/browser", () => ({
  browser: {},
}));

describe("validateSelectValue", () => {
  // Task 3.3: Tests for validateSelectValue() validation

  describe("native HTMLSelectElement", () => {
    it("should return isValid=true when value matches an option text", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      `;

      const result = validateSelectValue(select, "United States");
      expect(result.isValid).toBe(true);
      expect(result.matchedOption).toBe("United States");
      expect(result.availableOptions).toContain("United States");
      expect(result.availableOptions).toContain("Canada");
    });

    it("should return isValid=true when value matches an option value", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      `;

      const result = validateSelectValue(select, "ca");
      expect(result.isValid).toBe(true);
      expect(result.matchedOption).toBe("Canada");
    });

    it("should return isValid=false when value doesn't match any option", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="us">United States</option>
        <option value="ca">Canada</option>
      `;

      const result = validateSelectValue(select, "France");
      expect(result.isValid).toBe(false);
      expect(result.matchedOption).toBeUndefined();
      expect(result.availableOptions.length).toBe(2);
    });

    it("should be case-insensitive when matching", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="us">United States</option>
      `;

      const result = validateSelectValue(select, "united states");
      expect(result.isValid).toBe(true);
    });

    it("should handle partial substring matches", () => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="us">United States of America</option>
      `;

      const result = validateSelectValue(select, "States");
      expect(result.isValid).toBe(true);
    });
  });

  describe("framework dropdowns (Element)", () => {
    it("should validate against options in framework dropdown", () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <ul>
          <li data-value="us">United States</li>
          <li data-value="ca">Canada</li>
        </ul>
      `;

      const result = validateSelectValue(div, "Canada");
      expect(result.isValid).toBe(true);
      expect(result.availableOptions).toContain("United States");
      expect(result.availableOptions).toContain("Canada");
    });

    it("should validate against role='option' elements", () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <div role="option" data-value="us">United States</div>
        <div role="option" data-value="ca">Canada</div>
      `;

      const result = validateSelectValue(div, "United States");
      expect(result.isValid).toBe(true);
    });

    it("should return isValid=false for non-matching value in framework dropdown", () => {
      const div = document.createElement("div");
      div.innerHTML = `
        <li data-value="us">United States</li>
        <li data-value="ca">Canada</li>
      `;

      const result = validateSelectValue(div, "France");
      expect(result.isValid).toBe(false);
    });
  });
});
