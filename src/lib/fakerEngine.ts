import { faker, allFakers } from "@faker-js/faker";
import type { FieldType, SelectElementType } from "./fieldDetector";

export type FieldConfig = {
  enabled: boolean;
  probability: number;
  customValues: string[];
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

export function generateValue(
  fieldType: FieldType,
  config: FieldConfig,
  location?: LocationContext,
): string | null {
  if (!config.enabled || !shouldFill(config.probability)) return null;

  if (config.customValues.length > 0) {
    return faker.helpers.arrayElement(config.customValues);
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
  value: string
): { isValid: boolean; matchedOption?: string; availableOptions: string[] } {
  let availableOptions: string[] = [];

  if (element instanceof HTMLSelectElement) {
    // Native select: scan options - include both text and value
    availableOptions = Array.from(element.options).map(o => o.text || o.value);
  } else {
    // Framework dropdown: scan child elements for options
    // Use multiple queries since querySelectorAll doesn't support comma in all environments
    const options1 = element.querySelectorAll('[role="option"]');
    const options2 = element.querySelectorAll('li');
    const options3 = element.querySelectorAll('[data-value]');
    
    const allOptions = [...Array.from(options1), ...Array.from(options2), ...Array.from(options3)];
    const seen = new Set<string>();
    for (const el of allOptions) {
      const text = el.textContent || el.getAttribute('data-value') || '';
      if (text && !seen.has(text)) {
        seen.add(text);
        availableOptions.push(text);
      }
    }
  }

  const search = value.toLowerCase().trim();

  // Check if search matches any option (text or value for native selects)
  let matched: string | undefined = undefined;

  if (element instanceof HTMLSelectElement) {
    // For native selects, also check option.values
    for (const option of Array.from(element.options)) {
      const optionText = (option.text ?? "").toLowerCase();
      const optionValue = (option.value ?? "").toLowerCase();

      if (optionText.includes(search) || optionValue.includes(search) ||
          search.includes(optionText) || search.includes(optionValue)) {
        matched = option.text || option.value;
        break;
      }
    }
  } else {
    // For framework dropdowns, just check the extracted text/values
    matched = availableOptions.find(opt =>
      opt.toLowerCase().includes(search) || search.includes(opt.toLowerCase())
    );
  }

  return {
    isValid: !!matched,
    matchedOption: matched,
    availableOptions,
  };
}
