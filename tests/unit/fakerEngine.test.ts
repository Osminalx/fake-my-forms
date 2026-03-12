import { describe, it, expect } from "bun:test";
import { generateValue } from "../../src/lib/fakerEngine";
import type { FieldType } from "../../src/lib/fieldDetector";

const enabledConfig = { enabled: true, probability: 100, customValues: [] };
const disabledConfig = { enabled: false, probability: 100, customValues: [] };
const zeroProbabilityConfig = { enabled: true, probability: 0, customValues: [] };

const ALL_FIELD_TYPES: FieldType[] = [
  "email", "firstName", "lastName", "name", "phone",
  "address", "city", "zipCode", "company", "username",
  "password", "date", "number", "text", "unknown",
];

describe("generateValue — basic generation", () => {
  for (const fieldType of ALL_FIELD_TYPES) {
    it(`returns a non-empty string for fieldType="${fieldType}"`, () => {
      const result = generateValue(fieldType, enabledConfig);
      expect(result).toBeTypeOf("string");
      expect((result as string).length).toBeGreaterThan(0);
    });
  }
});

describe("generateValue — disabled config", () => {
  it("returns null when enabled=false", () => {
    expect(generateValue("email", disabledConfig)).toBeNull();
  });

  it("returns null for every field type when disabled", () => {
    for (const fieldType of ALL_FIELD_TYPES) {
      expect(generateValue(fieldType, disabledConfig)).toBeNull();
    }
  });
});

describe("generateValue — probability", () => {
  it("always returns null when probability=0", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateValue("email", zeroProbabilityConfig)).toBeNull();
    }
  });

  it("never returns null when probability=100", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateValue("email", enabledConfig)).not.toBeNull();
    }
  });

  it("returns roughly half results for probability=50", () => {
    let nullCount = 0;
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      if (generateValue("email", { enabled: true, probability: 50, customValues: [] }) === null) {
        nullCount++;
      }
    }
    // expect roughly 50% nulls with some tolerance
    expect(nullCount).toBeGreaterThan(runs * 0.25);
    expect(nullCount).toBeLessThan(runs * 0.75);
  });
});

describe("generateValue — customValues", () => {
  it("picks from customValues when provided", () => {
    const custom = ["foo", "bar", "baz"];
    const config = { enabled: true, probability: 100, customValues: custom };
    for (let i = 0; i < 20; i++) {
      expect(custom).toContain(generateValue("email", config));
    }
  });

  it("never returns a value outside the customValues array", () => {
    const custom = ["only-value"];
    const config = { enabled: true, probability: 100, customValues: custom };
    for (let i = 0; i < 10; i++) {
      expect(generateValue("text", config)).toBe("only-value");
    }
  });

  it("ignores customValues when array is empty", () => {
    const result = generateValue("firstName", enabledConfig);
    expect(result).not.toBeNull();
  });
});

describe("generateValue — output format sanity checks", () => {
  it("email contains @", () => {
    expect(generateValue("email", enabledConfig)).toContain("@");
  });

  it("date is ISO date format (YYYY-MM-DD)", () => {
    const date = generateValue("date", enabledConfig);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("number result is a numeric string", () => {
    const num = generateValue("number", enabledConfig);
    expect(Number(num)).not.toBeNaN();
  });

  it("password is at least 12 characters", () => {
    const pw = generateValue("password", enabledConfig);
    expect((pw as string).length).toBeGreaterThanOrEqual(12);
  });
});
