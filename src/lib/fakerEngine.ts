import { allFakers, faker } from "@faker-js/faker";
import type { FieldType } from "./fieldDetector";

export interface CustomValueWeight {
	value: string;
	weight: number;
}

export type FieldConfig = {
	enabled: boolean;
	probability: number;
	customValues: CustomValueWeight[];
};

export type FakerConfig = Partial<Record<FieldType, FieldConfig>>;

export const LOCALE_COUNTRY_MAP: Record<string, string> = {
	en_US: "United States",
	en_AU: "Australia",
	en_CA: "Canada",
	en_GB: "United Kingdom",
	de: "Germany",
	fr: "France",
	es: "Spain",
	pt_BR: "Brazil",
	ja: "Japan",
	it: "Italy",
	pt_PT: "Portugal",
	nl: "Netherlands",
	pl: "Poland",
	ar: "Saudi Arabia",
	zh_CN: "China",
	ko: "South Korea",
	ru: "Russia",
	tr: "Turkey",
	sv: "Sweden",
	nb_NO: "Norway",
	da: "Denmark",
	fi: "Finland",
	ro: "Romania",
	hu: "Hungary",
	uk: "Ukraine",
	sk: "Slovakia",
};

const LOCALE_KEYS = Object.keys(LOCALE_COUNTRY_MAP);

export type LocationContext = {
	country: string;
	localeFaker: typeof faker;
};

export function createLocationContext(pickedLocale?: string): LocationContext {
	const locale =
		pickedLocale && pickedLocale in LOCALE_COUNTRY_MAP
			? pickedLocale
			: faker.helpers.arrayElement(LOCALE_KEYS);
	return {
		country: LOCALE_COUNTRY_MAP[locale],
		localeFaker: (allFakers as Record<string, typeof faker>)[locale],
	};
}

function shouldFill(probability: number): boolean {
	return Math.random() * 100 < probability;
}

export function pickWeighted(items: CustomValueWeight[]): string | null {
	// Filter out zero/negative weights
	const active = items.filter((item) => item.weight > 0);
	if (active.length === 0) return null;
	if (active.length === 1) return active[0].value;

	// Build cumulative sum array
	const cumsum: number[] = [];
	let total = 0;
	for (const item of active) {
		total += item.weight;
		cumsum.push(total);
	}

	// Pick random point
	const r = Math.random() * total;

	// Binary search for first cumsum[i] > r
	let lo = 0;
	let hi = active.length;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		if (cumsum[mid] > r) {
			hi = mid;
		} else {
			lo = mid + 1;
		}
	}

	return active[lo].value;
}

/**
 * Migrates a FakerConfig from legacy storage format (string[] customValues)
 * to the current CustomValueWeight[] format.
 *
 * - string[] items → mapped to { value, weight: 100 }
 * - Already-migrated CustomValueWeight[] → passed through unchanged
 * - Missing/undefined/null customValues → set to []
 * - Returns a NEW object (immutable transform — input is not mutated)
 */
export function migrateFieldConfig(config: FakerConfig): FakerConfig {
	const result: FakerConfig = {};

	for (const [key, field] of Object.entries(config)) {
		if (!field) {
			result[key] = field;
			continue;
		}

		const cv = field.customValues as unknown;

		let migrated: CustomValueWeight[];
		if (!Array.isArray(cv) || cv.length === 0) {
			migrated = [];
		} else if (typeof cv[0] === "string") {
			migrated = (cv as string[]).map((v) => ({ value: v, weight: 100 }));
		} else {
			migrated = cv as CustomValueWeight[];
		}

		result[key] = {
			...field,
			customValues: migrated,
		};
	}

	return result;
}

export function generateValue(
	fieldType: FieldType,
	config: FieldConfig,
	location?: LocationContext,
): string | null {
	if (!config.enabled || !shouldFill(config.probability)) return null;

	if (config.customValues.length > 0) {
		const active = config.customValues.filter((item) => item.weight > 0);
		if (active.length > 0) {
			// The MAX weight across all custom values determines the probability
			// of choosing a custom value vs falling through to faker.
			//   weight=100 → always custom
			//   weight=50  → 50% custom, 50% faker
			//   weight=0   → always faker
			const maxWeight = Math.max(...active.map((item) => item.weight));
			if (Math.random() * 100 < maxWeight) {
				const picked = pickWeighted(config.customValues);
				if (picked !== null) return picked;
			}
		}
		// Fall through to faker generator when all weights are 0
		// or when the random roll doesn't favor custom values
	}

	const loc = location?.localeFaker ?? faker;

	const generators: Record<FieldType, () => string> = {
		email: () => faker.internet.email(),
		firstName: () => faker.person.firstName(),
		lastName: () => faker.person.lastName(),
		name: () => faker.person.fullName(),
		phone: () => faker.phone.number(),
		address: () => loc.location.streetAddress(),
		city: () => loc.location.city(),
		zipCode: () => loc.location.zipCode(),
		country: () => location?.country ?? faker.location.country(),
		state: () => loc.location.state(),
		company: () => faker.company.name(),
		username: () => faker.internet.username(),
		password: () => faker.internet.password({ length: 12 }),
		date: () => faker.date.birthdate().toISOString().split("T")[0],
		age: () => String(faker.number.int({ min: 18, max: 80 })),
		number: () => String(faker.number.int({ min: 1, max: 999 })),
		text: () => faker.lorem.words(3),
		unknown: () => faker.lorem.word(),
	};

	return generators[fieldType]?.() ?? null;
}

/**
 * Validates a faker-generated value against actually available options
 * in a native select or framework dropdown.
 * Returns validation result with match info and available options for logging.
 */
export function validateSelectValue(
	element: HTMLSelectElement | Element,
	value: string,
): { isValid: boolean; matchedOption?: string; availableOptions: string[] } {
	let availableOptions: string[] = [];

	// tagName for cross-document safety (Firefox Xray wrappers)
	if (element.tagName === "SELECT") {
		// Native select: scan options - include both text and value
		availableOptions = Array.from((element as HTMLSelectElement).options).map(
			(o) => o.text || o.value,
		);
	} else {
		// Framework dropdown: scan child elements for options
		// Use multiple queries since querySelectorAll doesn't support comma in all environments
		const options1 = element.querySelectorAll('[role="option"]');
		const options2 = element.querySelectorAll("li");
		const options3 = element.querySelectorAll("[data-value]");

		const allOptions = [
			...Array.from(options1),
			...Array.from(options2),
			...Array.from(options3),
		];
		const seen = new Set<string>();
		for (const el of allOptions) {
			const text = el.textContent || el.getAttribute("data-value") || "";
			if (text && !seen.has(text)) {
				seen.add(text);
				availableOptions.push(text);
			}
		}
	}

	const search = value.toLowerCase().trim();

	// Check if search matches any option (text or value for native selects)
	let matched: string | undefined;

	if (element.tagName === "SELECT") {
		// For native selects, also check option.values
		for (const option of Array.from(element.options)) {
			const optionText = (option.text ?? "").toLowerCase();
			const optionValue = (option.value ?? "").toLowerCase();

			if (
				optionText.includes(search) ||
				optionValue.includes(search) ||
				(optionText.length > 0 && search.includes(optionText)) ||
				(optionValue.length > 0 && search.includes(optionValue))
			) {
				matched = option.text || option.value;
				break;
			}
		}
	} else {
		// For framework dropdowns, just check the extracted text/values
		matched = availableOptions.find(
			(opt) =>
				opt.toLowerCase().includes(search) ||
				search.includes(opt.toLowerCase()),
		);
	}

	return {
		isValid: !!matched,
		matchedOption: matched,
		availableOptions,
	};
}
