import { describe, it, expect } from "bun:test";
import type { SemanticField } from "../../src/lib/semanticGrouper";
import { buildGroups } from "../../src/lib/semanticGrouper";

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

// ---------------------------------------------------------------------------
// buildGroups with confirm patterns (locale-aware)
// ---------------------------------------------------------------------------
describe("buildGroups — confirm pattern matching", () => {
  function makeField(overrides: Partial<SemanticField>): SemanticField {
    return {
      id: `field-${Math.random()}`,
      element: document.createElement("input"),
      fieldType: "email",
      name: "",
      label: "",
      ...overrides,
    };
  }

  it("groups primary + confirm field as confirm-pair with default patterns", () => {
    const fields: SemanticField[] = [
      makeField({ id: "email-1", fieldType: "email", name: "email", label: "Email" }),
      makeField({ id: "email-2", fieldType: "email", name: "confirm-email", label: "Confirm Email" }),
    ];
    const groups = buildGroups(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("confirm-pair");
    if (groups[0].type === "confirm-pair") {
      expect(groups[0].primary.id).toBe("email-1");
      expect(groups[0].confirm.id).toBe("email-2");
    }
  });

  it("treats fields with 'repeat' in label/name as confirm fields", () => {
    const fields: SemanticField[] = [
      makeField({ id: "pass-1", fieldType: "password", name: "password", label: "Password" }),
      makeField({ id: "pass-2", fieldType: "password", name: "repeat-password", label: "Repeat Password" }),
    ];
    const groups = buildGroups(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("confirm-pair");
  });

  it("treats fields with 'verify' in label as confirm fields", () => {
    const fields: SemanticField[] = [
      makeField({ id: "email-1", fieldType: "email", name: "email", label: "Email" }),
      makeField({ id: "email-2", fieldType: "email", name: "verify-email", label: "Verify Email" }),
    ];
    const groups = buildGroups(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("confirm-pair");
  });

  it("treats fields with 'retype' in label as confirm fields", () => {
    const fields: SemanticField[] = [
      makeField({ id: "pass-1", fieldType: "password", name: "password", label: "Password" }),
      makeField({ id: "pass-2", fieldType: "password", name: "retype-password", label: "Retype Password" }),
    ];
    const groups = buildGroups(fields);
    expect(groups[0].type).toBe("confirm-pair");
  });

  it("uses provided confirmPatterns instead of defaults", () => {
    const fields: SemanticField[] = [
      makeField({ id: "email-1", fieldType: "email", name: "email", label: "Email" }),
      // English defaults would NOT match "wiederholen" (German)
      makeField({ id: "email-2", fieldType: "email", name: "email-wiederholen", label: "Email wiederholen" }),
    ];
    // With only default patterns, "wiederholen" won't match
    const groups = buildGroups(fields);
    expect(groups).toHaveLength(2); // no confirm-pair formed

    // With German confirm patterns, it should match
    const groupsDE = buildGroups(fields, [/wiederholen/i]);
    expect(groupsDE).toHaveLength(1);
    expect(groupsDE[0].type).toBe("confirm-pair");
  });

  it("Spanish 'confirmar' does NOT match with default English patterns", () => {
    const fields: SemanticField[] = [
      makeField({ id: "email-1", fieldType: "email", name: "email", label: "Email" }),
      makeField({ id: "email-2", fieldType: "email", name: "confirmar-email", label: "Confirmar email" }),
    ];
    const groups = buildGroups(fields);
    // "confirmar" should not match English defaults
    expect(groups).toHaveLength(2);
  });

  it("Spanish 'confirmar' matches when provided as a custom pattern", () => {
    const fields: SemanticField[] = [
      makeField({ id: "email-1", fieldType: "email", name: "email", label: "Email" }),
      makeField({ id: "email-2", fieldType: "email", name: "confirmar-email", label: "Confirmar email" }),
    ];
    const groups = buildGroups(fields, [/confirmar/i]);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("confirm-pair");
  });

  it("backward compat: no confirmPatterns param uses English defaults", () => {
    const fields: SemanticField[] = [
      makeField({ id: "p1", fieldType: "password", name: "pass", label: "Password" }),
      makeField({ id: "p2", fieldType: "password", name: "confirm-pass", label: "Confirm" }),
    ];
    const groups = buildGroups(fields);
    expect(groups).toHaveLength(1);
    expect(groups[0].type).toBe("confirm-pair");
  });
});
