import type { FieldType, SelectElementType } from "./fieldDetector";

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

const DEFAULT_CONFIRM_PATTERNS: RegExp[] = [
	/\bconfirm\b/i,
	/\brepeat\b/i,
	/\bverify\b/i,
	/\bretype\b/i,
];

function isConfirmField(
	field: SemanticField,
	confirmPatterns?: RegExp[],
): boolean {
	const patterns = confirmPatterns ?? DEFAULT_CONFIRM_PATTERNS;
	return patterns.some((p) => p.test(`${field.name} ${field.label}`));
}

export function buildGroups(
	fields: SemanticField[],
	confirmPatterns?: RegExp[],
): FieldGroup[] {
	const groups: FieldGroup[] = [];
	const used = new Set<string>();

	for (const field of fields) {
		if (used.has(field.id)) continue;

		if (!isConfirmField(field, confirmPatterns)) {
			const confirmField = fields.find(
				(f) =>
					!used.has(f.id) &&
					isConfirmField(f, confirmPatterns) &&
					f.fieldType === field.fieldType,
			);

			if (confirmField) {
				groups.push({
					type: "confirm-pair",
					primary: field,
					confirm: confirmField,
				});
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
