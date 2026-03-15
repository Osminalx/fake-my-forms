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
  | "number"
  | "text"
  | "unknown";

// Mapping of HTML autocomplete tokens to our FieldType
// https://html.spec.whatwg.org/multipage/form-elements.html#autofill-field
const AUTOCOMPLETE_TOKENS: Record<string, FieldType> = {
  "given-name": "firstName",
  "additional-name": "firstName", // sometimes used for middle name
  "family-name": "lastName",
  "email": "email",
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
  "country": "country",
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
function getLabelText(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  let labelText = "";

  // 1. aria-label (highest priority)
  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // 2. aria-labelledby (reference to another element)
  const ariaLabelledBy = input.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const labelledElement = document.getElementById(ariaLabelledBy);
    if (labelledElement) return labelledElement.textContent ?? "";
  }

  // 3. Label associated via for=id
  if (input.id) {
    const labelFor = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
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
    const describedElement = document.getElementById(ariaDescribedBy);
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
    const prevLabel = parent.previousElementSibling;
    if (prevLabel?.tagName === "LABEL") {
      return prevLabel.textContent ?? "";
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
function parseAutocompleteValue(input: HTMLInputElement): FieldType | null {
  const autocomplete = input.getAttribute("autocomplete");
  if (!autocomplete) return null;

  const tokens = autocomplete.toLowerCase().split(/\s+/);

  for (const token of tokens) {
    // Ignore tokens that are not field types
    if (token === "off" || token === "on" || token === "billing" || token === "shipping") {
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
function getDataAttributeHint(input: HTMLInputElement): string {
  const dataAttrs = ["data-testid", "data-cy", "data-test", "data-field", "data-name"];
  for (const attr of dataAttrs) {
    const value = input.getAttribute(attr);
    if (value) return value;
  }
  return "";
}

// RegExp patterns for matching in free text (labels, placeholders, etc.)
// IMPORTANT: We use \b (word boundaries) to avoid false positives
// Example: "Card Holders Full Name" should NOT match with "name" because "name" is not a complete word
// But we allow some special cases like "fullName" that contains "lname"
const FIELD_PATTERNS: Record<FieldType, RegExp> = {
  // Specific cases first (so that "Name" -> firstName, not "name")
  // We use boundaries to avoid substring matches in normal text
  // But we allow "fullName" which is a common case
  firstName: /\b(first.?name|firstname|fname)\b|^(nombre)$|^(Nombre)$|^(Name)$|\bnombre\b|\bprimer\b/i,
  lastName: /\b(last.?name|lastname|lname|fullname)\b|^(apellido)$|^(Apellido)$|^(Lastname)$|^(Last Name)$|\bsurname\b|\bapellidos?\b/i,
  
  // Generic name (after firstName/lastName to avoid collisions)
  // \bname$ matches "Name" at the end (e.g: "Card Holder's Full Name")
  // \bname\b matches any "name" as a complete word
  // \bfull\s*name\b matches "full name" or "fullname"
  name: /\bname$|\bname\b|\bfull\s*name\b/i,
  
  // Rest of fields - all with word boundaries
  // For zipCode we allow "zipCode" as a special case (data attributes)
  email: /\bemail\b|\bcorreo\b/i,
  phone: /\bphone\b|\btel[eé]?fono?\b|\bmobile\b|\bcel(?:ular)?\b|\bwhatsapp\b/i,
  address: /\baddress\b|\bdirecci[oó]n\b|\bstreet\b|\bdomicilio\b|\bcalle\b|\bnum(?:ero)?\b|n[°º]/i,
  city: /\bcity\b|\bciudad\b|\bpoblaci[oó]n\b|\bmunicipio\b/i,
  state: /\bstate\b|\bprovincia\b|\bestado\b|\bregi[oó]n\b/i,
  country: /\bcountry\b|\bpa[ií]s\b|\bnacionalidad\b/i,
  zipCode: /\b(zip|postal|cp|cep|pos(?:tal)?|c[oó]digo(?:postal)?)\b|zipcode\b/i,
  company: /\bcompany\b|\bempresa\b|\borganization\b|\borg(?:anizaci[oó]n)?\b|\bnegocio\b/i,
  username: /\busername\b|\busuario\b|\blogin\b|\baccount\b/i,
  password: /\bpass(?:word)?\b|\bcontrase[nñ]a\b|\bclave\b|\bpin\b/i,
  date: /\bdate\b|\bfecha\b|\bdob\b|\bbirth(?:day)?\b|\bnacimiento\b/i,
  number: /\bnumber\b|\bcantidad\b|\bamount\b|\bcount\b|\bcant\b|\bmonto\b|\bedad\b|\bage\b/i,
  text: /.*/,
  unknown: /.*/,
};

// Verification order: first specific, then generic
// This ensures that "Name" → firstName (not name), "Lastname" → lastName (not text)
const FIELD_TYPE_PRIORITY: FieldType[] = [
  "firstName", "lastName", // specific go first
  "name", // generic after
  "email", "phone", "address", "city", "state", "country", "zipCode", "company", "username", "password", "date", "number",
  "text", "unknown",
];

/**
 * Detects the field type using a signal hierarchy
 * Priority order (from highest to lowest):
 * 1. autocomplete token (most reliable - HTML standard)
 * 2. label/aria-label/aria-labelledby
 * 3. name, id, placeholder
 * 4. input.type (fallback)
 */
export function detectFieldType(input: HTMLInputElement): FieldType {
  // 1. HIGH PRIORITY: Autocomplete token
  const autocompleteType = parseAutocompleteValue(input);
  if (autocompleteType) return autocompleteType;

  // Helper function to check if a type matches using the correct priority
  const matches = (type: FieldType, text: string): boolean => {
    if (type === "text" || type === "unknown") return false;
    return FIELD_PATTERNS[type].test(text);
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
  const signals = [
    input.name,
    input.id,
    input.placeholder,
  ].join(" ");

  for (const type of FIELD_TYPE_PRIORITY) {
    if (matches(type, signals)) return type;
  }

  // 6. FALLBACK: native input.type
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