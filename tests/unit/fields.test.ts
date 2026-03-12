import { describe, it, expect } from "bun:test";
import { FIELDS } from "../../src/lib/fields";
import type { FieldType } from "../../src/lib/fieldDetector";

describe("FIELDS array", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(FIELDS)).toBe(true);
    expect(FIELDS.length).toBeGreaterThan(0);
  });

  it("has exactly 10 field definitions", () => {
    expect(FIELDS.length).toBe(10);
  });

  it("every entry has a non-empty type string", () => {
    for (const field of FIELDS) {
      expect(field.type).toBeTypeOf("string");
      expect(field.type.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty icon string", () => {
    for (const field of FIELDS) {
      expect(field.icon).toBeTypeOf("string");
      expect(field.icon.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty label string", () => {
    for (const field of FIELDS) {
      expect(field.label).toBeTypeOf("string");
      expect(field.label.length).toBeGreaterThan(0);
    }
  });

  it("all type values are unique", () => {
    const types = FIELDS.map((f) => f.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });

  it("covers expected field types", () => {
    const types = FIELDS.map((f) => f.type);
    const expected: FieldType[] = [
      "email", "firstName", "lastName", "phone",
      "address", "city", "zipCode", "company", "username", "password",
    ];
    for (const t of expected) {
      expect(types).toContain(t);
    }
  });
});
