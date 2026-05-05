import { describe, it, expect } from "bun:test";
import type { SemanticField } from "../../src/lib/semanticGrouper";

// Task 2: Add failing type test for SemanticField.element including HTMLSelectElement
describe("SemanticField type", () => {
  it("should accept HTMLSelectElement in SemanticField.element", () => {
    // This test verifies that SemanticField.element can be a HTMLSelectElement
    // Currently this should fail compilation since the type only includes HTMLInputElement | HTMLTextAreaElement
    
    const select = document.createElement("select");
    select.innerHTML = `<option value="us">United States</option>`;
    
    const field: SemanticField = {
      id: "country-select",
      element: select,  // This should fail before REQ-6 is implemented
      fieldType: "country",
      name: "country",
      label: "Country",
    };
    
    expect(field.element).toBeInstanceOf(HTMLSelectElement);
    expect(field.fieldType).toBe("country");
  });
});
