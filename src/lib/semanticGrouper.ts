import { type FieldType, type SelectElementType } from "./fieldDetector";

export type SemanticField = {
  id: string;
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | Element;
  fieldType: FieldType;
  name: string;
  label: string;
  isFrameworkDropdown?: boolean;
  frameworkType?: SelectElementType;
};

export type FieldGroup =
  | { type: "confirm-pair"; primary: SemanticField; confirm: SemanticField }
  | { type: "single"; field: SemanticField };

const CONFIRM_PATTERNS = [
  /confirm/i,
  /repeat/i,
  /verify/i,
  /retype/i,
  /zweite/i,
  /confirmar/i,
];

function isConfirmField(field: SemanticField): boolean {
  return CONFIRM_PATTERNS.some((p) => p.test(field.name + " " + field.label));
}

export function buildGroups(fields: SemanticField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  const used = new Set<string>();

  for (const field of fields) {
    if (used.has(field.id)) continue;

    if (!isConfirmField(field)) {
      const confirmField = fields.find(
        (f) =>
          !used.has(f.id) &&
          isConfirmField(f) &&
          f.fieldType === field.fieldType,
      );

      if (confirmField) {
        groups.push({ type: "confirm-pair", primary: field, confirm: confirmField });
        used.add(field.id);
        used.add(confirmField.id);
        continue;
      }
    }

    groups.push({ type: "single", field });
    used.add(field.id);
  }

  return groups;
}
