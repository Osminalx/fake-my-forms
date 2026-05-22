export type FieldType =
	| "email"
	| "name"
	| "firstName"
	| "lastName"
	| "phone"
	| "address"
	| "city"
	| "state"
	| "country"
	| "zipCode"
	| "company"
	| "username"
	| "password"
	| "date"
	| "age"
	| "number"
	| "text"
	| "unknown";

// Type for detecting framework-specific dropdowns vs native selects
export type SelectElementType =
	| "native-select"
	| "vue-dropdown"
	| "react-dropdown";

import { loadLocale } from "./locales";
import type { LocalePatterns } from "./locales";

// Type extracted in case we could reutilize it or the getInputsOfType function
type inputType = "radio" | "checkbox";

export function getInputsOfType(
	element: Element,
	type: inputType,
): HTMLInputElement[] {
	const children = element.querySelectorAll<HTMLInputElement>(
		`input[type="${type}"]`,
	);

	return Array.from(children);
}

export function findGroupContainer(
	input: HTMLInputElement,
	type: inputType,
): Element {
	let currentElement = input.parentElement;

	while (currentElement?.parentElement) {
		if (
			getInputsOfType(currentElement.parentElement, type).length >
			getInputsOfType(currentElement, type).length
		) {
			return currentElement;
		}
		currentElement = currentElement.parentElement;
	}

	return currentElement ?? input;
}

export function detectRadioElement(
	element: HTMLInputElement,
	doc: Document = document,
): HTMLInputElement[] {
	const name = element.name;
	if (name) {
		return Array.from(
			doc.querySelectorAll<HTMLInputElement>(
				`input[type="radio"][name="${name}"]`,
			),
		);
	}

	const groupContainer = findGroupContainer(element, "radio");
	return getInputsOfType(groupContainer, "radio");
}

export function detectCheckboxElement(
	element: HTMLInputElement,
	doc: Document = document,
): HTMLInputElement[] {
	const name = element.name;
	if (name) {
		return Array.from(
			doc.querySelectorAll<HTMLInputElement>(
				`input[type="checkbox"][name="${name}"]`,
			),
		);
	}

	const groupContainer = findGroupContainer(element, "checkbox");
	return getInputsOfType(groupContainer, "checkbox");
}

/**
 * Detects if an element is a native select or a framework-specific custom dropdown.
 * Returns the element type or null if not a select/dropdown.
 *
 * Detection priority:
 * 1. Native <select>
 * 2. React fiber internal property (definitive)
 * 3. React Select class/id naming conventions (css-*, react-select-*, __input)
 * 4. Vue data-v-* scope attributes (definitive)
 * 5. ARIA role="combobox"/"listbox" with Vue class indicators
 * 6. Generic class/role fallbacks
 */
export function detectSelectElementType(
	element: Element,
): SelectElementType | null {
	// Native HTML select element
	// tagName for cross-document safety (Firefox Xray wrappers)
	if (element.tagName === "SELECT") {
		return "native-select";
	}

	// React detection via internal fiber property (most reliable — set by React runtime)
	const reactFiberKey = Object.keys(element).find(
		(k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
	);
	if (element.hasAttribute("data-reactroot") || reactFiberKey !== undefined) {
		return "react-dropdown";
	}

	// React Select naming conventions:
	// IDs: "react-select-N-input", classes: "css-*", "*__input", "*__control"
	const elementId = element.getAttribute("id") ?? "";
	const classAttr = element.className ?? "";
	if (
		/^react-select-/.test(elementId) ||
		/react-select/i.test(classAttr) ||
		// CSS-in-JS class pattern used by react-select (css-<hash>-*)
		(/css-[a-z0-9]+-/.test(classAttr) &&
			element.getAttribute("role") === "combobox") ||
		// react-select generated input classes like "subjects-auto-complete__input"
		/__input$/.test(classAttr.trim().split(/\s+/).at(-1) ?? "")
	) {
		return "react-dropdown";
	}

	// Vue.js detection: data-v-* scope attributes or __vue__ internal property
	const hasVueDataAttr = Array.from(element.attributes).some((attr) =>
		attr.name.startsWith("data-v-"),
	);
	if (hasVueDataAttr || "__vue__" in element) {
		return "vue-dropdown";
	}

	// ARIA role-based detection — check for Vue indicators on the element or its container
	const role = element.getAttribute("role");
	if (role === "combobox" || role === "listbox") {
		const container =
			element.closest('[class*="v-select"], [class*="vue-select"]') ??
			element.closest("[data-v-]");
		if (container) return "vue-dropdown";
		// Check class patterns on parent for Vue Select
		if (
			/vue-select|v-select/i.test(element.closest("[class]")?.className ?? "")
		) {
			return "vue-dropdown";
		}
		// Default: treat any unrecognised combobox/listbox as react-dropdown
		// since react-select is by far the most common library using these ARIA roles
		return "react-dropdown";
	}

	// Class-based fallbacks
	if (/vue-select|v-select/i.test(classAttr)) return "vue-dropdown";
	if (/dropdown|select-menu/i.test(classAttr)) return "vue-dropdown";

	return null;
}

// Mapping of HTML autocomplete tokens to our FieldType
// https://html.spec.whatwg.org/multipage/form-elements.html#autofill-field
const AUTOCOMPLETE_TOKENS: Record<string, FieldType> = {
	"given-name": "firstName",
	"additional-name": "firstName", // sometimes used for middle name
	"family-name": "lastName",
	email: "email",
	tel: "phone",
	"tel-country-code": "phone",
	"tel-national": "phone",
	"tel-area-code": "phone",
	"tel-local": "phone",
	"street-address": "address",
	"address-line1": "address",
	"address-line2": "address",
	"address-line3": "address",
	"address-level1": "state",
	"address-level2": "city",
	"address-level3": "city",
	"postal-code": "zipCode",
	country: "country",
	"country-name": "country",
	organization: "company",
	"organization-title": "company",
	username: "username",
	"current-password": "password",
	"new-password": "password",
	"cc-name": "name",
	"cc-number": "number",
	"cc-exp": "date",
	"cc-exp-month": "number",
	"cc-exp-year": "number",
};

/**
 * Finds the text of the label associated with an input
 * Implements the HTML specification for how labels are associated
 */
export function getLabelText(
	input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
	doc: Document = document,
): string {
	let labelText = "";

	// 1. aria-label (highest priority)
	const ariaLabel = input.getAttribute("aria-label");
	if (ariaLabel) return ariaLabel;

	// 2. aria-labelledby (reference to another element)
	const ariaLabelledBy = input.getAttribute("aria-labelledby");
	if (ariaLabelledBy) {
		const labelledElement = doc.getElementById(ariaLabelledBy);
		if (labelledElement) return labelledElement.textContent ?? "";
	}

	// 3. Label associated via for=id
	if (input.id) {
		const labelFor = doc.querySelector(
			`label[for="${CSS.escape(input.id)}"]`,
		);
		if (labelFor) {
			labelText = labelFor.textContent ?? "";
			if (labelText) return labelText;
		}
	}

	// 4. Wrapping label (input inside label)
	const parentLabel = input.closest("label");
	if (parentLabel) {
		labelText = parentLabel.textContent ?? "";
		if (labelText) return labelText;
	}

	// 5. aria-describedby (additional descriptions)
	const ariaDescribedBy = input.getAttribute("aria-describedby");
	if (ariaDescribedBy) {
		const describedElement = doc.getElementById(ariaDescribedBy);
		if (describedElement) return describedElement.textContent ?? "";
	}

	// 6. Search for sibling label (label before/after the input)
	// Searches for label as direct sibling OR within the sibling element
	// IMPORTANT: we limit the search to the immediate scope of the input
	const parent = input.parentElement;
	if (parent) {
		// If the input is inside a field container (e.g: div.field), search for the label within the same container
		// Typical structure: div.field > label + input OR div.field > (label, input)

		// Search for label as direct previous sibling (structure: div > label, input)
		const prevSibling = parent.previousElementSibling;
		if (prevSibling) {
			if (prevSibling.tagName === "LABEL") {
				return prevSibling.textContent ?? "";
			}
			// Search inside previous sibling for a label
			// Common pattern: <div><label>Email</label></div><div><input /></div>
			const labelInside = prevSibling.querySelector("label");
			if (labelInside) return labelInside.textContent ?? "";
		}

		// Search for label as first child of the same parent (structure: div > (label, input))
		// IMPORTANT: only search among the first 2 children to avoid capturing distant labels
		const children = Array.from(parent.children).slice(0, 2);
		for (const child of children) {
			if (child.tagName === "LABEL") {
				return child.textContent ?? "";
			}
			// Also search inside the first child (structure: div > div > label, input)
			const labelInChild = child.querySelector("label");
			if (labelInChild) return labelInChild.textContent ?? "";
		}
	}

	return "";
}

/**
 * Parses the autocomplete attribute and returns the first relevant token
 * The autocomplete can have multiple tokens: "given-name billing home"
 * We are interested in the first one that is not "billing", "shipping", "off"
 */
export function parseAutocompleteValue(
	input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): FieldType | null {
	const autocomplete = input.getAttribute("autocomplete");
	if (!autocomplete) return null;

	const tokens = autocomplete.toLowerCase().split(/\s+/);

	for (const token of tokens) {
		// Ignore tokens that are not field types
		if (
			token === "off" ||
			token === "on" ||
			token === "billing" ||
			token === "shipping"
		) {
			continue;
		}
		if (token in AUTOCOMPLETE_TOKENS) {
			return AUTOCOMPLETE_TOKENS[token];
		}
	}

	return null;
}

/**
 * Searches for data-* attributes that may indicate the field type
 * Common in testing: data-testid, data-cy, data-test, data-field
 */
function getDataAttributeHint(
	input: HTMLInputElement | HTMLTextAreaElement,
): string {
	const dataAttrs = [
		"data-testid",
		"data-cy",
		"data-test",
		"data-field",
		"data-name",
	];
	for (const attr of dataAttrs) {
		const value = input.getAttribute(attr);
		if (value) return value;
	}
	return "";
}

// FIELD_PATTERNS has been moved to src/lib/locales/ — now locale-aware.
// Patterns are loaded via loadLocale(locale).fieldPatterns[type].

// Verification order: first specific, then generic
// This ensures that "Name" → firstName (not name), "Lastname" → lastName (not text)
const FIELD_TYPE_PRIORITY: FieldType[] = [
	"firstName",
	"lastName", // specific go first
	"name", // generic after
	"email",
	"phone",
	"address",
	"city",
	"state",
	"country",
	"zipCode",
	"company",
	"username",
	"password",
	"date",
	"age",
	"number",
	"text",
	"unknown",
];

/**
 * Detects the field type using a signal hierarchy
 * Priority order (from highest to lowest):
 * 1. autocomplete token (most reliable - HTML standard)
 * 2. label/aria-label/aria-labelledby
 * 3. name, id, placeholder
 * 4. input.type (fallback)
 */
export function detectFieldType(
	input: HTMLInputElement | HTMLTextAreaElement,
	locale?: string,
): FieldType {
	// Resolve locale patterns once for this detection call
	const localePatterns = loadLocale(locale);

	// 1. HIGH PRIORITY: Autocomplete token
	const autocompleteType = parseAutocompleteValue(input);
	if (autocompleteType) return autocompleteType;

	// Helper function to check if a type matches using the correct priority
	const matches = (type: FieldType, text: string): boolean => {
		if (type === "text" || type === "unknown") return false;
		const patterns = localePatterns.fieldPatterns[type];
		if (!patterns || patterns.length === 0) return false;
		return patterns.some((p) => p.test(text));
	};

	// 2. HIGH PRIORITY: aria-label (explicit)
	const ariaLabel = input.getAttribute("aria-label");
	if (ariaLabel) {
		for (const type of FIELD_TYPE_PRIORITY) {
			if (matches(type, ariaLabel)) return type;
		}
	}

	// 3. MEDIUM PRIORITY: Associated label
	const labelText = getLabelText(input);
	if (labelText) {
		// Clean label (remove " *", ":", etc)
		const cleanLabel = labelText.replace(/[*:\s]+$/, "").trim();
		for (const type of FIELD_TYPE_PRIORITY) {
			if (matches(type, cleanLabel)) return type;
		}
	}

	// 4. MEDIUM PRIORITY: data-* attributes
	const dataHint = getDataAttributeHint(input);
	if (dataHint) {
		for (const type of FIELD_TYPE_PRIORITY) {
			if (matches(type, dataHint)) return type;
		}
	}

	// 5. LOW PRIORITY: name, id, placeholder
	const signals = [input.name, input.id, input.placeholder].join(" ");

	for (const type of FIELD_TYPE_PRIORITY) {
		if (matches(type, signals)) return type;
	}

	// 6. FALLBACK: element type
	// Textareas are always text entry fields — fill with lorem if nothing else matches
	// tagName for cross-document safety (Firefox Xray wrappers)
	if (input.tagName === "TEXTAREA") return "text";

	// IMPORTANT: we return "unknown" (no fill) instead of "text" (lorem ipsum)
	// to avoid incorrect filling when we cannot detect the type
	if (input.type === "email") return "email";
	if (input.type === "tel") return "phone";
	if (input.type === "date") return "date";
	if (input.type === "number") return "number";
	if (input.type === "password") return "password";
	if (input.type === "search") return "text";

	return "unknown";
}

/**
 * Detects the field type for a select element or framework dropdown using a signal hierarchy
 * Priority order (from highest to lowest):
 * 1. autocomplete token (most reliable - HTML standard)
 * 2. aria-label / aria-labelledby
 * 3. label association (label[for], wrapping label, sibling label)
 * 4. data-* attributes
 * 5. name, id
 *
 * Note: No input.type fallback since select elements don't have type attribute.
 * Extended to accept Element to support framework dropdowns (Vue/React custom dropdowns).
 */
export function detectSelectFieldType(
	element: HTMLSelectElement | Element,
	locale?: string,
): FieldType {
	// Resolve locale patterns once for this detection call
	const localePatterns = loadLocale(locale);

	// Helper function to check if a type matches using the correct priority
	const matches = (type: FieldType, text: string): boolean => {
		if (type === "text" || type === "unknown") return false;
		const patterns = localePatterns.fieldPatterns[type];
		if (!patterns || patterns.length === 0) return false;
		return patterns.some((p) => p.test(text));
	};

	// For native select elements, use the original logic path
	// tagName for cross-document safety (Firefox Xray wrappers)
	if (element.tagName === "SELECT") {
		// 1. HIGH PRIORITY: Autocomplete token
		const autocompleteType = parseAutocompleteValue(element);
		if (autocompleteType) return autocompleteType;

		// 2. HIGH PRIORITY: aria-label (explicit)
		const ariaLabel = element.getAttribute("aria-label");
		if (ariaLabel) {
			for (const type of FIELD_TYPE_PRIORITY) {
				if (matches(type, ariaLabel)) return type;
			}
		}

		// 3. MEDIUM PRIORITY: Associated label
		const labelText = getLabelText(element);
		if (labelText) {
			// Clean label (remove " *", ":", etc)
			const cleanLabel = labelText.replace(/[*:\s]+$/, "").trim();
			for (const type of FIELD_TYPE_PRIORITY) {
				if (matches(type, cleanLabel)) return type;
			}
		}

		// 4. MEDIUM PRIORITY: data-* attributes
		const dataHint = getDataAttributeHintForSelect(element);
		if (dataHint) {
			for (const type of FIELD_TYPE_PRIORITY) {
				if (matches(type, dataHint)) return type;
			}
		}

		// 5. LOW PRIORITY: name, id
		const signals = [element.name, element.id].join(" ");

		for (const type of FIELD_TYPE_PRIORITY) {
			if (matches(type, signals)) return type;
		}
	} else {
		// For framework dropdowns (non-select elements), scan child options for signals
		// 1. HIGH PRIORITY: Autocomplete token on the container
		const autocompleteType = (() => {
			const autocomplete = element.getAttribute("autocomplete");
			if (!autocomplete) return null;
			const tokens = autocomplete.toLowerCase().split(/\s+/);
			for (const token of tokens) {
				if (
					token === "off" ||
					token === "on" ||
					token === "billing" ||
					token === "shipping"
				) {
					continue;
				}
				if (token in AUTOCOMPLETE_TOKENS) {
					return AUTOCOMPLETE_TOKENS[token];
				}
			}
			return null;
		})();
		if (autocompleteType) return autocompleteType;

		// 2. HIGH PRIORITY: aria-label
		const ariaLabel = element.getAttribute("aria-label");
		if (ariaLabel) {
			for (const type of FIELD_TYPE_PRIORITY) {
				if (matches(type, ariaLabel)) return type;
			}
		}

		// 3. MEDIUM PRIORITY: Associated label
		const labelText = getLabelText(element as unknown as HTMLSelectElement);
		if (labelText) {
			const cleanLabel = labelText.replace(/[*:\s]+$/, "").trim();
			for (const type of FIELD_TYPE_PRIORITY) {
				if (matches(type, cleanLabel)) return type;
			}
		}

		// 4. MEDIUM PRIORITY: data-* attributes on container or child options
		const dataAttrs = [
			"data-testid",
			"data-cy",
			"data-test",
			"data-field",
			"data-name",
		];
		for (const attr of dataAttrs) {
			const value = element.getAttribute(attr);
			if (value) {
				for (const type of FIELD_TYPE_PRIORITY) {
					if (matches(type, value)) return type;
				}
			}
		}

		// 5. LOW PRIORITY: name, id on the element itself plus closest container
		// For framework dropdowns like React Select, the outer wrapper often has a
		// meaningful id (e.g. id="state", id="city") while the <input> has a generated
		// id like "react-select-3-input". We also check the closest container's id.
		const signalsBase = [
			element.getAttribute("name"),
			element.getAttribute("id"),
		];

		const container = element.closest<HTMLElement>("[id]");
		if (container && container !== element) {
			const containerId = container.getAttribute("id");
			if (containerId) signalsBase.push(containerId);
		}

		const signals = signalsBase.filter(Boolean).join(" ");

		for (const type of FIELD_TYPE_PRIORITY) {
			if (matches(type, signals)) return type;
		}
	}

	return "unknown";
}

/**
 * Searches for data-* attributes that may indicate the field type
 * Common in testing: data-testid, data-cy, data-test, data-field
 */
function getDataAttributeHintForSelect(select: HTMLSelectElement): string {
	const dataAttrs = [
		"data-testid",
		"data-cy",
		"data-test",
		"data-field",
		"data-name",
	];
	for (const attr of dataAttrs) {
		const value = select.getAttribute(attr);
		if (value) return value;
	}
	return "";
}
