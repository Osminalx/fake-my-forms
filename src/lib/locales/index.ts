import type { FieldType } from "../fieldDetector";
import { defaultPatterns } from "./default";
import { esPatterns } from "./es";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocalePatterns {
	fieldPatterns: Partial<Record<FieldType, RegExp[]>>;
	confirmPatterns: RegExp[];
}

type LocaleOverride = {
	fieldPatterns: Partial<Record<FieldType, RegExp[]>>;
	confirmPatterns?: RegExp[];
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const localeRegistry: Record<string, LocaleOverride> = {};

export function registerLocale(lang: string, patterns: LocaleOverride): void {
	localeRegistry[lang] = patterns;
}

// Register built-in locales
registerLocale("es", esPatterns);

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

function mergePatterns(
	base: LocalePatterns,
	override: LocaleOverride,
): LocalePatterns {
	const merged: LocalePatterns = {
		fieldPatterns: { ...base.fieldPatterns },
		confirmPatterns: [...base.confirmPatterns],
	};

	for (const [type, patterns] of Object.entries(override.fieldPatterns)) {
		const key = type as FieldType;
		const basePatterns = merged.fieldPatterns[key] ?? [];
		merged.fieldPatterns[key] = [...basePatterns, ...patterns];
	}

	if (override.confirmPatterns) {
		merged.confirmPatterns = [
			...merged.confirmPatterns,
			...override.confirmPatterns,
		];
	}

	return merged;
}

// ---------------------------------------------------------------------------
// Locale detection
// ---------------------------------------------------------------------------

/**
 * Reads the page's `<html lang="...">` attribute and extracts the base language.
 * Falls back to `"en"` when no lang is set.
 */
export function detectPageLocale(): string {
	const lang = document.documentElement.lang;
	if (!lang) return "en";
	return lang.split("-")[0];
}

// ---------------------------------------------------------------------------
// Sync loader (module-level cache)
// ---------------------------------------------------------------------------

const cache = new Map<string, LocalePatterns>();

/**
 * Returns locale patterns synchronously from the pre-registered locale registry.
 *
 * Cascade: explicit locale → detectPageLocale() → "en"
 *
 * Results are cached after first resolution per language.
 */
export function loadLocale(locale?: string): LocalePatterns {
	const lang = (locale ?? detectPageLocale()).split("-")[0];

	if (cache.has(lang)) return cache.get(lang)!;

	if (lang === "en" || !localeRegistry[lang]) {
		cache.set(lang, defaultPatterns);
		return defaultPatterns;
	}

	const merged = mergePatterns(defaultPatterns, localeRegistry[lang]);
	cache.set(lang, merged);
	return merged;
}

/**
 * Reset the locale cache (useful for tests).
 */
export function resetLocaleCache(): void {
	cache.clear();
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { defaultPatterns } from "./default";
export { esPatterns } from "./es";
