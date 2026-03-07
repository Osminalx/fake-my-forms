import { faker } from "@faker-js/faker";
import type { FieldType } from "./fieldDetector";

export type FieldConfig = {
  enabled: boolean;
  probability: number;
  customValues: string[];
};

export type FakerConfig = Partial<Record<FieldType, FieldConfig>>;

function shouldFill(probability: number): boolean {
  return Math.random() * 100 < probability;
}

export function generateValue(
  fieldType: FieldType,
  config: FieldConfig,
): string | null {
  if (!config.enabled || !shouldFill(config.probability)) return null;

  if (config.customValues.length > 0) {
    return faker.helpers.arrayElement(config.customValues);
  }

  const generators: Record<FieldType, () => string> = {
    email: () => faker.internet.email(),
    firstName: () => faker.person.firstName(),
    lastName: () => faker.person.lastName(),
    name: () => faker.person.fullName(),
    phone: () => faker.phone.number(),
    address: () => faker.location.streetAddress(),
    city: () => faker.location.city(),
    zipCode: () => faker.location.zipCode(),
    company: () => faker.company.name(),
    username: () => faker.internet.username(),
    password: () => faker.internet.password({ length: 12 }),
    date: () => faker.date.birthdate().toISOString().split("T")[0],
    number: () => String(faker.number.int({ min: 1, max: 999 })),
    text: () => faker.lorem.words(3),
    unknown: () => faker.lorem.word(),
  };

  return generators[fieldType]?.() ?? null;
}
