import type { FieldType } from "../fieldDetector";

/**
 * English-only field patterns.
 * Each field type is an array of RegExp — this makes override-merging trivial
 * (just concatenate arrays for each field type).
 *
 * Stripped of all non-English keywords that were in the original FIELD_PATTERNS.
 */
export const defaultPatterns: {
	fieldPatterns: Partial<Record<FieldType, RegExp[]>>;
	confirmPatterns: RegExp[];
} = {
	fieldPatterns: {
		firstName: [
			/\bfirst.?name\b/i,
			/\bfirstname\b/i,
			/\bfname\b/i,
			// Standalone "Name" (capitalised) maps to firstName via priority
			/^Name$/i,
		],
		lastName: [
			/\blast.?name\b/i,
			/\blname\b/i,
			/\bfullname\b/i,
			/\bsurname\b/i,
		],
		name: [
			/\bname\b/i,
			/\bfull\s*name\b/i,
		],
		email: [/\bemail\b/i],
		phone: [/\bphone\b/i, /\bmobile\b/i, /\bwhatsapp\b/i],
		address: [/\baddress\b/i, /\bstreet\b/i],
		city: [/\bcity\b/i],
		state: [/\bstate\b/i, /\bregion\b/i],
		country: [/\bcountry\b/i],
		zipCode: [/\bzip\b/i, /\bpostal\b/i, /\bzipcode\b/i],
		company: [/\bcompany\b/i, /\borganization\b/i],
		username: [/\busername\b/i, /\blogin\b/i, /\baccount\b/i],
		password: [/\bpassword\b/i, /\bpin\b/i],
		date: [/\bdate\b/i, /\bdob\b/i, /\bbirth\b/i, /\bbirthday\b/i],
		age: [/\bage\b/i],
		number: [/\bnumber\b/i, /\bamount\b/i, /\bcount\b/i],
		// text and unknown are never matched via patterns (matches() skips them),
		// but we include them for completeness.
		text: [/.*/],
		unknown: [/.*/],
	},
	confirmPatterns: [/\bconfirm\b/i, /\brepeat\b/i, /\bverify\b/i, /\bretype\b/i],
};
