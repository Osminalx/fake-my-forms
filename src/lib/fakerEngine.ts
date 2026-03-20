import { faker, allFakers } from "@faker-js/faker";
import type { FieldType } from "./fieldDetector";

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
