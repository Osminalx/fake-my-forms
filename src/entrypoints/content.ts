import { browser } from "wxt/browser";
import {
	createLocationContext,
	type FakerConfig,
	generateValue,
	migrateFieldConfig,
	validateSelectValue,
} from "@/lib/fakerEngine";
import {
	detectFieldType,
	detectSelectElementType,
	detectSelectFieldType,
	detectRadioElement,
	detectCheckboxElement,
	getLabelText,
	type SelectElementType,
} from "@/lib/fieldDetector";
import { buildGroups, type FieldGroup, type SemanticField } from "@/lib/semanticGrouper";
import { detectPageLocale, loadLocale } from "@/lib/locales";
import type { PreviewEntry } from "@/lib/types";

// Since the modern javascript frameworks detect changes through events
// it's not as simple as just input.value = 'something'
function fillInput(
	input: HTMLInputElement | HTMLTextAreaElement,
	value: string,
) {
	// File inputs cannot be set programmatically — browsers throw InvalidStateError
	// Use tagName instead of instanceof for cross-document safety (Firefox Xray wrappers)
	if (input.tagName === "INPUT" && input.type === "file") return;

	// Use the correct prototype setter based on element type
	const prototype =
		input.tagName === "TEXTAREA"
			? window.HTMLTextAreaElement.prototype
			: window.HTMLInputElement.prototype;

	const nativeInputSetter = Object.getOwnPropertyDescriptor(
		prototype,
		"value",
	)?.set;

	try {
		nativeInputSetter?.call(input, value);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	} catch (e) {
		console.debug(
			"[fake-my-forms] fillInput skipped restricted input",
			input.type,
			e,
		);
	}
}

export function fillSelect(select: HTMLSelectElement, value: string): boolean {
	// Guard: disabled
	if (select.disabled) {
		console.debug("[fake-my-forms] Skipped disabled select", select);
		return false;
	}

	// Guard: multiple
	if (select.multiple) {
		console.debug("[fake-my-forms] Skipped multiple select", select);
		return false;
	}

	// Guard: zero options
	if (select.options.length === 0) {
		console.debug("[fake-my-forms] Skipped select with zero options", select);
		return false;
	}

	const search = value.toLowerCase().trim();

	// Validate: check if value matches any available option
	const validation = validateSelectValue(select, value);
	if (!validation.isValid) {
		const availableOptions = validation.availableOptions.join(", ");
		console.warn(
			`[fake-my-forms] No matching option for '${value}' in [${availableOptions}]`,
			select,
		);
		return false;
	}

	// Iterate options in DOM order, find first match
	for (const option of Array.from(select.options)) {
		// Skip disabled and empty-value placeholder options
		if (option.disabled || option.value === "") continue;

		const optionText = (option.text ?? "").toLowerCase();
		const optionValue = (option.value ?? "").toLowerCase();

		// REQ-9: case-insensitive partial substring matching
		// Match if either text or value contains the search term, or vice versa
		// Guard against empty strings — an empty optionText/optionValue matches everything
		const matches =
			optionText.includes(search) ||
			optionValue.includes(search) ||
			(optionText.length > 0 && search.includes(optionText)) ||
			(optionValue.length > 0 && search.includes(optionValue));

		if (matches) {
			// REQ-4: set select.value — uses patched prototype from tests/setup.ts
			select.value = option.value;

			// REQ-4: dispatch input and change events (bubbles: true)
			select.dispatchEvent(new Event("input", { bubbles: true }));
			select.dispatchEvent(new Event("change", { bubbles: true }));
			return true;
		}
	}

	// No match found (should not reach here if validation passed, but safety fallback)
	const availableOptions = Array.from(select.options)
		.map((o) => o.text || o.value)
		.join(", ");
	console.warn(
		`[fake-my-forms] No matching option for '${value}' in [${availableOptions}]`,
		select,
	);
	return false;
}

/**
 * Finds the option list for a framework dropdown.
 *
 * Lookup order (most specific → most general):
 * 1. aria-controls → getElementById → querySelectorAll('[role="option"]')
 * 2. Any [role="listbox"] in the document → its [role="option"] children
 * 3. Direct document-wide [role="option"] scan (catches all portals)
 */
function findDropdownOptions(element: HTMLElement, doc?: Document): Element[] {
	const owner = doc ?? element.ownerDocument ?? document;

	// 1. aria-controls is set by React Select when the menu is open
	const listboxId = element.getAttribute("aria-controls");
	if (listboxId && listboxId !== element.id) {
		const listbox = owner.getElementById(listboxId);
		if (listbox) {
			const opts = Array.from(listbox.querySelectorAll('[role="option"]'));
			if (opts.length > 0) return opts;
			// Listbox found but no options yet — caller will retry
			return [];
		}
	}

	// 2. Any visible listbox in the document (React Select portal, Vue Select portal, etc.)
	const allListboxes = owner.querySelectorAll('[role="listbox"]');
	for (const lb of Array.from(allListboxes)) {
		const opts = Array.from(lb.querySelectorAll('[role="option"]'));
		if (opts.length > 0) return opts;
	}

	// 3. Flat document scan — some libraries don't nest options inside a listbox
	return Array.from(owner.querySelectorAll('[role="option"]'));
}

/**
 * Handles framework-specific dropdowns (React Select, Vue Select, etc.)
 * by simulating the user interaction sequence:
 *   1. Focus the input
 *   2. Type the search value (triggers onInputChange → menu opens)
 *   3. Wait for the menu portal to render
 *   4. Find matching option via aria-controls listbox or document scan
 *   5. Click the option
 */
export function handleFrameworkDropdown(
	element: HTMLElement,
	value: string,
	elementType: SelectElementType,
): boolean {
	const dbg = (msg: string, ...args: unknown[]) =>
		console.debug(`[fake-my-forms][fw-dropdown] ${msg}`, ...args);

	dbg("called", {
		id: element.id,
		tag: element.tagName,
		role: element.getAttribute("role"),
		isConnected: element.isConnected,
		disabled: element.hasAttribute("disabled"),
		ariaDisabled: element.getAttribute("aria-disabled"),
		closestAriaDisabled: element.closest('[aria-disabled="true"]') !== null,
		value,
		elementType,
	});

	// Guard: disabled element or disabled container
	if (
		element.hasAttribute("disabled") ||
		element.getAttribute("aria-disabled") === "true" ||
		element.closest('[aria-disabled="true"]') !== null
	) {
		dbg("SKIP disabled", element.id);
		return false;
	}

	// tagName for cross-document safety (Firefox Xray wrappers)
	const isInput = element.tagName === "INPUT";
	// const nativeInputSetter = isInput
	// 	? Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
	// 	: null;

	const closeDropdown = () => {
		try {
			element.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "Escape",
					bubbles: true,
					cancelable: true,
				}),
			);
		} catch {
			/* ignore */
		}
	};

	try {
		// Open the dropdown by clicking the control wrapper.
		// React Select's onControlMouseDown handler opens the menu on mousedown.
		// We do NOT type a search value here — we want ALL options visible so we can
		// pick the best match. Typing a locale-specific generated value (e.g. an Arabic
		// city name) would filter React Select's option list to zero results.
		const control =
			element.closest<HTMLElement>(
				'[class*="-control"], [class*="__control"]',
			) ??
			element.parentElement ??
			element;

		dbg("open strategy: mousedown on control", {
			id: element.id,
			controlClass: control.className,
		});

		control.dispatchEvent(
			new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
				composed: true,
			}),
		);
		control.dispatchEvent(
			new MouseEvent("mouseup", {
				bubbles: true,
				cancelable: true,
				button: 0,
				composed: true,
			}),
		);
		control.click();

		// Focus the inner input so React Select keeps the menu open
		if (isInput) {
			element.focus();

			// Fallback: dispatch ArrowDown keydown to open the menu.
			// Some React Select versions — or frameworks — don't respond reliably
			// to a synthetic mousedown on the control. ArrowDown on the focused
			// input triggers the built-in keyboard handler which calls openMenu().
			element.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "ArrowDown",
					bubbles: true,
					cancelable: true,
				}),
			);
		}

		dbg("open dispatched", element.id);
	} catch (e) {
		dbg("open dispatch THREW", e);
		return false;
	}

	// React Select renders the menu portal asynchronously after setState.
	// We poll with exponential backoff to handle slow renders.
	// Delays: 150ms, 350ms, 700ms (total ~1.2s max wait)
	const RETRY_DELAYS = [150, 350, 700];

	const trySelectOption = (attempt: number) => {
		dbg(`setTimeout fired (attempt ${attempt})`, {
			id: element.id,
			isConnected: element.isConnected,
		});

		if (!element.isConnected) {
			dbg("element disconnected, aborting", element.id);
			return;
		}

		// If the menu didn't open (aria-expanded is still false), re-try the open gesture
		const menuExpanded = element.getAttribute("aria-expanded") === "true";
		dbg("aria-expanded", menuExpanded);

		const options = findDropdownOptions(element);
		dbg(
			"options found",
			options.length,
			options.map((o) => o.textContent?.trim()),
		);

		if (options.length === 0) {
			if (attempt <= RETRY_DELAYS.length) {
				dbg(`no options yet (attempt ${attempt}), retrying…`, element.id);

				// If the menu still hasn't opened after first attempt, try ArrowDown
				// + mousedown again — React Select may need a second interaction.
				if (attempt >= 2) {
					const retryControl =
						element.closest<HTMLElement>(
							'[class*="-control"], [class*="__control"]',
						) ??
						element.parentElement ??
						element;

					retryControl.dispatchEvent(
						new MouseEvent("mousedown", {
							bubbles: true,
							cancelable: true,
							button: 0,
							composed: true,
						}),
					);
					if (isInput) {
						element.focus();
						element.dispatchEvent(
							new KeyboardEvent("keydown", {
								key: "ArrowDown",
								bubbles: true,
								cancelable: true,
							}),
						);
					}
				}

				setTimeout(
					() => trySelectOption(attempt + 1),
					RETRY_DELAYS[attempt - 1] ?? 700,
				);
				return;
			}
			console.warn(
				"[fake-my-forms] No options found after opening framework dropdown",
				element,
			);
			closeDropdown();
			return;
		}

		// Filter out disabled options
		const enabledOptions = options.filter(
			(o) => o.getAttribute("aria-disabled") !== "true",
		);
		if (enabledOptions.length === 0) {
			console.warn("[fake-my-forms] All options are disabled", element);
			closeDropdown();
			return;
		}

		const search = value.toLowerCase().trim();
		dbg("searching for", search, "among", enabledOptions.length, "options");

		// Try semantic match first (bidirectional substring, guard empty strings)
		let matched: Element | undefined;
		for (const option of enabledOptions) {
			const text = (option.textContent ?? "").toLowerCase().trim();
			const dataValue = (option.getAttribute("data-value") ?? "").toLowerCase();

			if (
				text.includes(search) ||
				(text.length > 0 && search.includes(text)) ||
				dataValue.includes(search) ||
				(dataValue.length > 0 && search.includes(dataValue))
			) {
				matched = option;
				break;
			}
		}

		// Fall back to a random option — the generated value may be locale-specific
		// and not match any of the dropdown's available options (e.g. an Arabic city
		// name in a dropdown of Indian states).
		if (!matched) {
			matched =
				enabledOptions[Math.floor(Math.random() * enabledOptions.length)];
			dbg(
				"no semantic match, picking random option",
				matched.textContent?.trim(),
			);
		} else {
			dbg("semantic match found", matched.textContent?.trim());
		}

		try {
			(matched as HTMLElement).click();
		} catch (e) {
			dbg("option.click() THREW", e);
		}
	};

	setTimeout(() => trySelectOption(1), RETRY_DELAYS[0]);
	return true; // Optimistic — actual fill happens asynchronously
}

/**
 * Picks a random valid option from a select element.
 * Used as fallback when fieldType is unknown and no semantic value can be generated.
 */
function fillSelectRandom(select: HTMLSelectElement): boolean {
	if (select.disabled || select.multiple) return false;
	const validOptions = Array.from(select.options).filter(
		(o) => !o.disabled && o.value !== "",
	);
	if (validOptions.length === 0) return false;

	const picked = validOptions[Math.floor(Math.random() * validOptions.length)];
	select.value = picked.value;
	select.dispatchEvent(new Event("input", { bubbles: true }));
	select.dispatchEvent(new Event("change", { bubbles: true }));
	return true;
}

/**
 * Sets checked state on a radio/checkbox using the native property setter
 * to trigger framework change detection (React, Vue, etc.).
 * Mirrors the pattern used in fillInput() for the `value` property.
 */
function fillCheckboxOrRadio(input: HTMLInputElement, checked: boolean) {
	const nativeCheckedSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"checked",
	)?.set;

	try {
		nativeCheckedSetter?.call(input, checked);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	} catch (e) {
		console.debug("[fake-my-forms] fillCheckboxOrRadio skipped", e);
	}
}

/**
 * Processes all radio button groups in the document.
 * For each group, picks ONE random option and selects it.
 *
 * Uses detectRadioElement() to find related radios (by name attribute
 * or by structural container grouping). Skips disabled radios.
 *
 * Returns the number of radio groups filled.
 */
function processRadioGroups(doc: Document = document): number {
	const allRadios = doc.querySelectorAll<HTMLInputElement>(
		'input[type="radio"]',
	);
	const processed = new Set<HTMLInputElement>();
	let filled = 0;

	for (const radio of allRadios) {
		if (processed.has(radio) || radio.disabled) continue;

		const group = detectRadioElement(radio, doc);
		group.forEach((r) => processed.add(r));

		const enabled = group.filter((r) => !r.disabled);
		if (enabled.length === 0) continue;

		const picked = enabled[Math.floor(Math.random() * enabled.length)];
		fillCheckboxOrRadio(picked, true);
		filled++;
	}

	return filled;
}

/**
 * Processes all checkbox groups in the document.
 * For each group, picks a random number (0 to N) of options and selects them.
 *
 * - 0 means the group is skipped entirely (all checkboxes remain unchecked)
 * - 1 to N selects that many random checkboxes from the group
 *
 * Uses detectCheckboxElement() to find related checkboxes (by name attribute
 * or by structural container grouping). Skips disabled checkboxes.
 *
 * Returns the number of checkbox groups filled (where count > 0).
 */
function processCheckboxGroups(doc: Document = document): number {
	const allCheckboxes = doc.querySelectorAll<HTMLInputElement>(
		'input[type="checkbox"]',
	);
	const processed = new Set<HTMLInputElement>();
	let filled = 0;

	for (const cb of allCheckboxes) {
		if (processed.has(cb) || cb.disabled) continue;

		const group = detectCheckboxElement(cb, doc);
		group.forEach((c) => processed.add(c));

		const enabled = group.filter((c) => !c.disabled);
		if (enabled.length === 0) continue;

		// Random count between 0 and enabled.length (inclusive)
		const count = Math.floor(Math.random() * (enabled.length + 1));
		if (count === 0) continue; // skip the group entirely

		// Fisher-Yates shuffle, take first `count`
		const shuffled = [...enabled];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}

		for (const item of shuffled.slice(0, count)) {
			fillCheckboxOrRadio(item, true);
		}
		filled++;
	}

	return filled;
}

export function countFillableInDocument(doc: Document): number {
	const elements = doc.querySelectorAll(
		'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]), textarea, select',
	);

	// Filter out disabled and multiple selects (REQ-1)
	// tagName for cross-document safety (Firefox Xray wrappers)
	return Array.from(elements).filter((el) => {
		if (el.tagName === "SELECT") {
			return !(el as HTMLSelectElement).disabled && !(el as HTMLSelectElement).multiple;
		}
		return true;
	}).length;
}

export function countFillableInputs(): number {
	let count = countFillableInDocument(document);
	const iframeDocs = getAccessibleFrameDocs(document);
	for (const iframeDoc of iframeDocs) {
		count += countFillableInDocument(iframeDoc);
	}
	return count;
}

/**
 * Iterates all iframe and frame elements in the given root document,
 * safely accesses their contentDocument, and returns accessible documents.
 * Cross-origin frames are silently skipped.
 */
export function getAccessibleFrameDocs(root: Document): Document[] {
	const result: Document[] = [];
	for (const el of root.querySelectorAll("iframe, frame")) {
		try {
			const d = (el as HTMLIFrameElement).contentDocument;
			if (d) result.push(d);
		} catch {
			/* cross-origin → silent skip */
		}
	}
	return result;
}

/**
 * Result summary for a single document's fill pass.
 */
interface FillDocumentResult {
	totalSelects: number;
	filled: number;
	skipped: number;
	frameworkDropdowns: number;
	radioGroups: number;
	checkboxGroups: number;
}

/**
 * A field group with its pre-computed value.
 * Internal type — bridges detectAndGenerate() and fillDocument().
 */
type FieldValueGroup = {
	group: FieldGroup;
	value: string | null;
};

/**
 * Shared internal: full detection + grouping + value generation.
 * Does NOT mutate DOM — no radio/checkbox pass, no fillInput/fillSelect calls.
 * Returns both serializable entries (for popup preview) and groups with element refs (for DOM application).
 */
function detectAndGenerate(
	doc: Document,
	config: FakerConfig,
	locale: string,
): { entries: PreviewEntry[]; groups: FieldValueGroup[] } {
	const localePatterns = loadLocale(locale);

	// Query fillable elements (same selector as the original fillDocument)
	const elements = doc.querySelectorAll(
		'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [role="combobox"], [role="listbox"], .dropdown, .select-menu',
	);

	const fields: SemanticField[] = [];
	let autoId = 0;

	elements.forEach((el) => {
		// Handle native select elements
		if (el.tagName === "SELECT") {
			const fieldType = detectSelectFieldType(el, locale);
			fields.push({
				id: el.id || `_fmf_${autoId++}`,
				element: el,
				fieldType,
				name: (el as HTMLSelectElement).name,
				label: getLabelText(el as unknown as HTMLSelectElement, doc),
			});
			return;
		}

		// Handle framework dropdowns (Vue/React custom dropdowns)
		const elementType = detectSelectElementType(el);
		if (elementType && elementType !== "native-select") {
			const fieldType = detectSelectFieldType(el, locale);
			console.debug("[fake-my-forms][discovery] framework dropdown", {
				id: el.id,
				tag: el.tagName,
				role: el.getAttribute("role"),
				elementType,
				fieldType,
				disabled: (el as HTMLElement).hasAttribute("disabled"),
				ariaDisabled: el.getAttribute("aria-disabled"),
			});
			fields.push({
				id: el.id || `_fmf_${autoId++}`,
				element: el,
				fieldType,
				name: el.getAttribute("name") || "",
				label: getLabelText(el as unknown as HTMLSelectElement, doc),
				isFrameworkDropdown: true,
				frameworkType: elementType,
			});
			return;
		}

		// Handle INPUT / TEXTAREA
		const tag = el.tagName;
		if (tag !== "INPUT" && tag !== "TEXTAREA") return;
		if (tag === "INPUT" && (el as HTMLInputElement).type === "file") return;

		const input = el as HTMLInputElement | HTMLTextAreaElement;
		const fieldType = detectFieldType(input, locale);
		fields.push({
			id: input.id || `_fmf_${autoId++}`,
			element: input,
			fieldType,
			name: input.tagName === "INPUT" ? (input as HTMLInputElement).name : "",
			label: getLabelText(input, doc),
		});
	});

	const groups = buildGroups(fields, localePatterns.confirmPatterns);
	const locationContext = createLocationContext(locale);

	console.debug(
		"[fake-my-forms][fill] groups to process:",
		groups.length,
		groups.map((g) =>
			g.type === "confirm-pair"
				? {
						type: "confirm-pair",
						primary: { id: g.primary.id, fieldType: g.primary.fieldType },
					}
				: {
						type: "single",
						id: g.field.id,
						fieldType: g.field.fieldType,
						isFrameworkDropdown: (
							g.field as SemanticField & { isFrameworkDropdown?: boolean }
						).isFrameworkDropdown,
					},
		),
	);

	const entries: PreviewEntry[] = [];
	const valueGroups: FieldValueGroup[] = [];

	for (const group of groups) {
		if (group.type === "confirm-pair") {
			const fieldConfig = config[group.primary.fieldType] ?? {
				enabled: true,
				probability: 100,
				customValues: [],
			};
			const value = generateValue(
				group.primary.fieldType,
				fieldConfig,
				locationContext,
			);
			const isFwPrimary = (
				group.primary as SemanticField & { isFrameworkDropdown?: boolean }
			).isFrameworkDropdown ?? false;
			const isFwConfirm = (
				group.confirm as SemanticField & { isFrameworkDropdown?: boolean }
			).isFrameworkDropdown ?? false;

			entries.push({
				id: group.primary.id,
				label: group.primary.label,
				fieldType: group.primary.fieldType,
				value,
				isFrameworkDropdown: isFwPrimary,
				groupType: "confirm-primary",
				groupId: group.primary.id,
			});
			entries.push({
				id: group.confirm.id,
				label: group.confirm.label,
				fieldType: group.confirm.fieldType,
				value,
				isFrameworkDropdown: isFwConfirm,
				groupType: "confirm",
				groupId: group.primary.id,
			});
			valueGroups.push({ group, value });
		} else {
			const fieldConfig = config[group.field.fieldType] ?? {
				enabled: true,
				probability: 100,
				customValues: [],
			};
			const value = generateValue(
				group.field.fieldType,
				fieldConfig,
				locationContext,
			);
			const isFw = (
				group.field as SemanticField & { isFrameworkDropdown?: boolean }
			).isFrameworkDropdown ?? false;

			entries.push({
				id: group.field.id,
				label: group.field.label,
				fieldType: group.field.fieldType,
				value,
				isFrameworkDropdown: isFw,
				groupType: "single",
				groupId: group.field.id,
			});
			valueGroups.push({ group, value });
		}
	}

	return { entries, groups: valueGroups };
}

/**
 * Pure value computation — no DOM writes.
 * Used by the PREVIEW_FILL message handler for the popup preview tab.
 * Returns the same values that fillDocument() would generate for identical inputs.
 */
export function computeFieldValues(
	doc: Document,
	config: FakerConfig,
	locale: string,
): PreviewEntry[] {
	return detectAndGenerate(doc, config, locale).entries;
}

/**
 * Fills all fillable fields in the given document (main page or same-origin iframe).
 * Returns a summary result object with counts.
 */
export function fillDocument(
	doc: Document,
	config: FakerConfig,
	locale: string,
): FillDocumentResult {
	// --- Radio / Checkbox pass ---
	// Process these FIRST so that conditional fields (revealed by radio/checkbox selection)
	// are visible when the main fill pass runs.
	const radioFilled = processRadioGroups(doc);
	const checkboxFilled = processCheckboxGroups(doc);

	// Use the shared detection + generation pipeline.
	// Returns pre-computed values for every field group.
	const { groups } = detectAndGenerate(doc, config, locale);

	// Summary statistics
	const stats = {
		totalSelects: 0,
		filled: radioFilled + checkboxFilled,
		skipped: 0,
		frameworkDropdowns: 0,
	};

	// Framework dropdowns that were disabled during the first pass (e.g. city locked until state is chosen).
	// We retry these after a delay so a state-selection has time to unlock them.
	type DeferredDropdown = {
		element: HTMLElement;
		value: string;
		frameworkType: SelectElementType;
	};
	const deferredDropdowns: DeferredDropdown[] = [];

	for (const { group, value } of groups) {
		if (group.type === "confirm-pair") {
			console.debug(
				"[fake-my-forms][fill] confirm-pair",
				group.primary.fieldType,
				"→ value:",
				value,
			);
			if (value) {
				// Check if it's a framework dropdown
				const primaryField = group.primary as SemanticField & {
					isFrameworkDropdown?: boolean;
					frameworkType?: SelectElementType;
				};
				if (primaryField.isFrameworkDropdown && primaryField.frameworkType) {
					if (primaryField.fieldType === "unknown") {
						console.debug(
							"[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType",
							primaryField.id,
						);
						stats.skipped++;
					} else {
						const filled = handleFrameworkDropdown(
							primaryField.element as HTMLElement,
							value,
							primaryField.frameworkType,
						);
						if (filled) stats.filled++;
						else stats.skipped++;
					}
				} else if (group.primary.element.tagName === "SELECT") {
					const filled = value
						? fillSelect(group.primary.element, value) ||
							fillSelectRandom(group.primary.element)
						: fillSelectRandom(group.primary.element);
					if (filled) stats.filled++;
					else stats.skipped++;
				} else {
					const el = group.primary.element;
					const t = el.tagName;
					if (t === "INPUT" || t === "TEXTAREA") {
						fillInput(el, value);
					}
				}

				// Fill confirm element
				const confirmField = group.confirm as SemanticField & {
					isFrameworkDropdown?: boolean;
					frameworkType?: SelectElementType;
				};
				if (confirmField.isFrameworkDropdown && confirmField.frameworkType) {
					if (confirmField.fieldType === "unknown") {
						console.debug(
							"[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType",
							confirmField.id,
						);
						stats.skipped++;
					} else {
						const filled = handleFrameworkDropdown(
							confirmField.element as HTMLElement,
							value,
							confirmField.frameworkType,
						);
						if (filled) stats.filled++;
						else stats.skipped++;
					}
				} else if (group.confirm.element.tagName === "SELECT") {
					const filled = value
						? fillSelect(group.confirm.element, value) ||
							fillSelectRandom(group.confirm.element)
						: fillSelectRandom(group.confirm.element);
					if (filled) stats.filled++;
					else stats.skipped++;
				} else {
					const el = group.confirm.element;
					const t = el.tagName;
					if (t === "INPUT" || t === "TEXTAREA") {
						fillInput(el, value);
					}
				}
			}
		} else {
			const field = group.field as SemanticField & {
				isFrameworkDropdown?: boolean;
				frameworkType?: SelectElementType;
			};
			console.debug(
				"[fake-my-forms][fill] single",
				field.fieldType,
				field.id,
				"→ value:",
				value,
				"| isFrameworkDropdown:",
				field.isFrameworkDropdown,
			);
			if (field.isFrameworkDropdown && field.frameworkType) {
				if (!value || field.fieldType === "unknown") {
					console.debug(
						"[fake-my-forms][fill] SKIP framework dropdown with unknown fieldType",
						field.id,
					);
					stats.skipped++;
				} else {
					const el = field.element as HTMLElement;
					// If the element is currently disabled, defer it — another field (e.g. state)
					// may unlock it after its async fill completes.
					const isDisabledNow =
						el.hasAttribute("disabled") ||
						el.getAttribute("aria-disabled") === "true" ||
						el.closest('[aria-disabled="true"]') !== null;

					if (isDisabledNow) {
						console.debug(
							"[fake-my-forms][fill] DEFER disabled framework dropdown (will retry)",
							field.id,
						);
						deferredDropdowns.push({
							element: el,
							value,
							frameworkType: field.frameworkType,
						});
						stats.skipped++;
					} else {
						const filled = handleFrameworkDropdown(
							el,
							value,
							field.frameworkType,
						);
						if (filled) stats.filled++;
						else stats.skipped++;
					}
				}
			} else if (group.field.element.tagName === "SELECT") {
				// Native select: try semantic fill first, fall back to random option pick
				const filled = value
					? fillSelect(group.field.element, value) ||
						fillSelectRandom(group.field.element)
					: fillSelectRandom(group.field.element);
				if (filled) stats.filled++;
				else stats.skipped++;
			} else if (value) {
				const el = group.field.element;
				const t = el.tagName;
				if (t === "INPUT" || t === "TEXTAREA") {
					fillInput(el, value);
				}
			}
		}
	}

	// Compute totalSelects and frameworkDropdowns from the groups
	for (const { group } of groups) {
		if (group.type === "confirm-pair") {
			const isFwP = (group.primary as SemanticField & { isFrameworkDropdown?: boolean }).isFrameworkDropdown ?? false;
			if (isFwP || group.primary.element.tagName === "SELECT") stats.totalSelects++;
			if (isFwP) stats.frameworkDropdowns++;
			const isFwC = (group.confirm as SemanticField & { isFrameworkDropdown?: boolean }).isFrameworkDropdown ?? false;
			if (isFwC || group.confirm.element.tagName === "SELECT") stats.totalSelects++;
			if (isFwC) stats.frameworkDropdowns++;
		} else {
			const isFw = (group.field as SemanticField & { isFrameworkDropdown?: boolean }).isFrameworkDropdown ?? false;
			if (isFw || group.field.element.tagName === "SELECT") stats.totalSelects++;
			if (isFw) stats.frameworkDropdowns++;
		}
	}

	// Retry dropdowns that were disabled in the first pass (e.g. city locked until state is picked).
	// We wait 800 ms: 300 ms for state's menu to open + option click + React re-render to unlock city.
	if (deferredDropdowns.length > 0) {
		console.debug(
			"[fake-my-forms] Scheduling deferred dropdown retry in 800ms",
			deferredDropdowns.map((d) => d.element.id),
		);
		setTimeout(() => {
			for (const { element, value, frameworkType } of deferredDropdowns) {
				const stillDisabled =
					element.hasAttribute("disabled") ||
					element.getAttribute("aria-disabled") === "true" ||
					element.closest('[aria-disabled="true"]') !== null;

				if (stillDisabled) {
					console.debug(
						"[fake-my-forms][deferred] Still disabled, skipping",
						element.id,
					);
					continue;
				}
				console.debug(
					"[fake-my-forms][deferred] Retrying now-enabled dropdown",
					element.id,
				);
				handleFrameworkDropdown(element, value, frameworkType);
			}
		}, 800);
	}

	return {
		totalSelects: stats.totalSelects,
		filled: stats.filled,
		skipped: stats.skipped,
		frameworkDropdowns: stats.frameworkDropdowns,
		radioGroups: radioFilled,
		checkboxGroups: checkboxFilled,
	};
}

export function fillAllInputs(config: FakerConfig, locale?: string) {
	// Cascade: explicit locale → detectPageLocale() → "en"
	const resolvedLocale = locale ?? detectPageLocale();

	// Fill main document
	const result = fillDocument(document, config, resolvedLocale);

	// Fill same-origin iframes
	const iframeDocs = getAccessibleFrameDocs(document);
	for (const iframeDoc of iframeDocs) {
		const iframeResult = fillDocument(iframeDoc, config, resolvedLocale);
		// Merge iframe stats into main result for the summary
		result.totalSelects += iframeResult.totalSelects;
		result.filled += iframeResult.filled;
		result.skipped += iframeResult.skipped;
		result.frameworkDropdowns += iframeResult.frameworkDropdowns;
		result.radioGroups += iframeResult.radioGroups;
		result.checkboxGroups += iframeResult.checkboxGroups;
	}

	// Log summary statistics
	console.debug("[fake-my-forms] fillAllInputs summary:", {
		totalSelects: result.totalSelects,
		filled: result.filled,
		skipped: result.skipped,
		frameworkDropdowns: result.frameworkDropdowns,
		radioGroups: result.radioGroups,
		checkboxGroups: result.checkboxGroups,
	});
}

async function getStoredFakerConfig(): Promise<FakerConfig> {
	const storage = browser.storage;
	if (!storage) return {};

	try {
		if (storage.sync) {
			const { fakerConfig } = await storage.sync.get("fakerConfig");
			return migrateFieldConfig((fakerConfig ?? {}) as FakerConfig);
		}
	} catch (error) {
		console.warn("[fake-my-forms] Failed reading sync storage:", error);
	}

	try {
		if (storage.local) {
			const { fakerConfig } = await storage.local.get("fakerConfig");
			return migrateFieldConfig((fakerConfig ?? {}) as FakerConfig);
		}
	} catch (error) {
		console.warn("[fake-my-forms] Failed reading local storage:", error);
	}

	return {};
}

export default defineContentScript({
	matches: ["<all_urls>"],
	main() {
		// Listen popup messages
		browser.runtime.onMessage.addListener((message) => {
			if (message.type === "FILL_FORM") {
				fillAllInputs(message.config, message.locale);
			}
		});
		// Count forms' inputs
		browser.runtime.onMessage.addListener((message) => {
			if (message.type === "GET_INPUT_STATS") {
				const count = countFillableInputs();
				return Promise.resolve({ count });
			}
		});
		// Preview fill values (passive — no DOM mutation)
		browser.runtime.onMessage.addListener((message) => {
			if (message.type === "PREVIEW_FILL") {
				const mainEntries = computeFieldValues(
					document,
					message.config,
					message.locale,
				);
				const iframeDocs = getAccessibleFrameDocs(document);
				let allEntries = [...mainEntries];
				for (const iframeDoc of iframeDocs) {
					const iframeEntries = computeFieldValues(
						iframeDoc,
						message.config,
						message.locale,
					);
					allEntries = allEntries.concat(iframeEntries);
				}
				return Promise.resolve({ entries: allEntries });
			}
		});

		// Listen keyboard shortcut
		document.addEventListener("keydown", async (e) => {
			if (e.altKey && e.shiftKey && e.key === "F") {
				const fakerConfig = await getStoredFakerConfig();
				fillAllInputs(fakerConfig, detectPageLocale());
			}
		});
	},
});
