import { describe, it, expect } from "bun:test";

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
