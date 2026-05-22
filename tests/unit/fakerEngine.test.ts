import { describe, it, expect } from "bun:test";
import {
	generateValue,
	migrateFieldConfig,
	pickWeighted,
} from "../../src/lib/fakerEngine";
import type { FakerConfig, FieldType, CustomValueWeight } from "../../src/lib/fakerEngine";

const enabledConfig = { enabled: true, probability: 100, customValues: [] };
const disabledConfig = { enabled: false, probability: 100, customValues: [] };
const zeroProbabilityConfig = { enabled: true, probability: 0, customValues: [] };

const ALL_FIELD_TYPES: FieldType[] = [
  "email", "firstName", "lastName", "name", "phone",
  "address", "city", "state", "zipCode", "country", "company",
  "username", "password", "date", "age", "number", "text", "unknown",
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
    const custom: CustomValueWeight[] = [
      { value: "foo", weight: 100 },
      { value: "bar", weight: 100 },
      { value: "baz", weight: 100 },
    ];
    const config = { enabled: true, probability: 100, customValues: custom };
    const values = custom.map((c) => c.value);
    for (let i = 0; i < 20; i++) {
      expect(values).toContain(generateValue("email", config));
    }
  });

  it("never returns a value outside the customValues array", () => {
    const custom: CustomValueWeight[] = [{ value: "only-value", weight: 100 }];
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

describe("generateValue — weighted custom values", () => {
  it("with weighted custom values, higher weight values appear more frequently", () => {
    // With maxWeight=80, custom values are chosen 80% of the time.
    // Among custom values, heavy(80) has 80/(80+20)=80% share.
    // So P(heavy) = 0.80 * 0.80 = 0.64 → ~3200 of 5000
    const config = {
      enabled: true,
      probability: 100,
      customValues: [
        { value: "heavy", weight: 80 },
        { value: "light", weight: 20 },
      ] satisfies CustomValueWeight[],
    };
    let heavyCount = 0;
    const runs = 5000;
    for (let i = 0; i < runs; i++) {
      if (generateValue("email", config) === "heavy") heavyCount++;
    }
    expect(heavyCount).toBeGreaterThan(runs * 0.56);
    expect(heavyCount).toBeLessThan(runs * 0.72);
  });

  it("weight determines probability of custom vs faker (single value at 50%)", () => {
    const config = {
      enabled: true,
      probability: 100,
      customValues: [{ value: "solo", weight: 50 }],
    };
    let customCount = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      if (generateValue("email", config) === "solo") customCount++;
    }
    // P(custom) = 50%. Expect ~1000. Allow 35%-65% range.
    expect(customCount).toBeGreaterThan(runs * 0.35);
    expect(customCount).toBeLessThan(runs * 0.65);
  });

  it("weight=100 always picks custom value (backward compatible)", () => {
    const config = {
      enabled: true,
      probability: 100,
      customValues: [{ value: "siempre", weight: 100 }],
    };
    for (let i = 0; i < 20; i++) {
      expect(generateValue("text", config)).toBe("siempre");
    }
  });

  it("weight=1 rarely picks custom value", () => {
    const config = {
      enabled: true,
      probability: 100,
      customValues: [{ value: "raro", weight: 1 }],
    };
    let customCount = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      if (generateValue("email", config) === "raro") customCount++;
    }
    // P(custom) = 1%. Expect ~20. Should be less than 5%.
    expect(customCount).toBeLessThan(runs * 0.05);
  });

  it("when all weights are 0, falls through to faker generator", () => {
    const config = {
      enabled: true,
      probability: 100,
      customValues: [{ value: "zeroed", weight: 0 }],
    };
    const result = generateValue("email", config);
    expect(result).not.toBe("zeroed");
    expect(result).toContain("@");
  });

  it("when customValues is empty, falls through to faker generator", () => {
    const result = generateValue("firstName", enabledConfig);
    expect(result).not.toBeNull();
  });
});

describe("pickWeighted", () => {
  it("returns null for empty array", () => {
    expect(pickWeighted([])).toBeNull();
  });

  it("returns the single value for array of one item (any weight > 0)", () => {
    expect(pickWeighted([{ value: "only", weight: 100 }])).toBe("only");
    expect(pickWeighted([{ value: "only", weight: 1 }])).toBe("only");
    expect(pickWeighted([{ value: "only", weight: 50 }])).toBe("only");
  });

  it("returns null when all weights are 0", () => {
    expect(pickWeighted([{ value: "a", weight: 0 }, { value: "b", weight: 0 }])).toBeNull();
  });

  it("with equal weights, distribution approximates uniform", () => {
    const items: CustomValueWeight[] = [
      { value: "a", weight: 100 },
      { value: "b", weight: 100 },
      { value: "c", weight: 100 },
    ];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    const runs = 200;
    for (let i = 0; i < runs; i++) {
      const result = pickWeighted(items);
      if (result) counts[result]++;
    }
    // With 3 equal items over 200 runs, each should be ~66
    // 20% of 200 = 40, 80% of 200 = 160
    for (const value of ["a", "b", "c"]) {
      expect(counts[value]).toBeGreaterThan(runs * 0.2);
      expect(counts[value]).toBeLessThan(runs * 0.8);
    }
  });

  it("with skewed weights [90, 10], heavier item picked >60% of time", () => {
    const items: CustomValueWeight[] = [
      { value: "heavy", weight: 90 },
      { value: "light", weight: 10 },
    ];
    let heavyCount = 0;
    const runs = 100;
    for (let i = 0; i < runs; i++) {
      if (pickWeighted(items) === "heavy") heavyCount++;
    }
    expect(heavyCount).toBeGreaterThan(60);
  });

  it("negative or zero weights are filtered out", () => {
    const items: CustomValueWeight[] = [
      { value: "positive", weight: 50 },
      { value: "zero", weight: 0 },
      { value: "negative", weight: -10 },
    ];
    for (let i = 0; i < 100; i++) {
      const result = pickWeighted(items);
      expect(result).toBe("positive");
    }
  });
});

describe("migrateFieldConfig", () => {
	it("converts legacy string[] customValues to CustomValueWeight[] with weight: 100", () => {
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
				customValues: ["a@a.com", "b@b.com"],
			},
		} as unknown as FakerConfig;

		const result = migrateFieldConfig(legacyConfig);

		expect(result.email?.customValues).toEqual([
			{ value: "a@a.com", weight: 100 },
			{ value: "b@b.com", weight: 100 },
		]);
	});

	it("converts empty string[] to empty CustomValueWeight[]", () => {
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
				customValues: [],
			},
		} as unknown as FakerConfig;

		const result = migrateFieldConfig(legacyConfig);

		expect(result.email?.customValues).toEqual([]);
	});

	it("passes already-migrated CustomValueWeight[] through unchanged", () => {
		const cv: CustomValueWeight[] = [
			{ value: "x", weight: 50 },
			{ value: "y", weight: 75 },
		];
		const config = {
			email: {
				enabled: true,
				probability: 100,
				customValues: cv,
			},
		} satisfies FakerConfig;

		const result = migrateFieldConfig(config);

		expect(result.email?.customValues).toEqual(cv);
		expect(result.email?.customValues[0].value).toBe("x");
		expect(result.email?.customValues[0].weight).toBe(50);
	});

	it("passes empty already-migrated CustomValueWeight[] through unchanged", () => {
		const config = {
			email: {
				enabled: true,
				probability: 100,
				customValues: [],
			},
		} satisfies FakerConfig;

		const result = migrateFieldConfig(config);
		expect(result.email?.customValues).toEqual([]);
	});

	it("handles field with customValues that is undefined (e.g. stored without key)", () => {
		// Simulate stored config that lacks customValues entirely
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
			},
		} as unknown as FakerConfig;

		const result = migrateFieldConfig(legacyConfig);

		expect(result.email?.customValues).toEqual([]);
	});

	it("handles field with customValues that is null", () => {
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
				customValues: null,
			},
		} as unknown as FakerConfig;

		const result = migrateFieldConfig(legacyConfig);

		expect(result.email?.customValues).toEqual([]);
	});

	it("does not mutate the input config (immutable transform)", () => {
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
				customValues: ["a", "b"],
			},
		} as unknown as FakerConfig;

		const originalCustomValues = (legacyConfig.email as Record<string, unknown>)
			.customValues;

		migrateFieldConfig(legacyConfig);

		// Verify input was not mutated
		expect(
			(legacyConfig.email as Record<string, unknown>).customValues,
		).toBe(originalCustomValues);
		expect(
			(legacyConfig.email as Record<string, unknown>).customValues,
		).toEqual(["a", "b"]);
	});

	it("handles config with multiple field types — some legacy, some already migrated", () => {
		const legacyConfig = {
			email: {
				enabled: true,
				probability: 100,
				customValues: ["old@a.com", "old@b.com"],
			},
			firstName: {
				enabled: true,
				probability: 100,
				customValues: [
					{ value: "Alice", weight: 50 },
					{ value: "Bob", weight: 50 },
				] as CustomValueWeight[],
			},
			phone: {
				enabled: false,
				probability: 0,
				customValues: [],
			},
		} as unknown as FakerConfig;

		const result = migrateFieldConfig(legacyConfig);

		expect(result.email?.customValues).toEqual([
			{ value: "old@a.com", weight: 100 },
			{ value: "old@b.com", weight: 100 },
		]);
		expect(result.firstName?.customValues).toEqual([
			{ value: "Alice", weight: 50 },
			{ value: "Bob", weight: 50 },
		]);
		expect(result.phone?.customValues).toEqual([]);
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
