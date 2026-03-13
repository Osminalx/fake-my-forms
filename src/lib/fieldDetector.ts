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

// Mapeo de tokens autocomplete HTML a nuestro FieldType
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
 * Busca el texto del label asociado a un input
 * Implementa la especificación HTML de cómo asociar labels
 */
function getLabelText(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  let labelText = "";

  // 1. aria-label (máxima prioridad)
  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // 2. aria-labelledby (referencia a otro elemento)
  const ariaLabelledBy = input.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const labelledElement = document.getElementById(ariaLabelledBy);
    if (labelledElement) return labelledElement.textContent ?? "";
  }

  // 3. Label asociado via for=id
  if (input.id) {
    const labelFor = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (labelFor) {
      labelText = labelFor.textContent ?? "";
      if (labelText) return labelText;
    }
  }

  // 4. Label envolvente (input dentro de label)
  const parentLabel = input.closest("label");
  if (parentLabel) {
    labelText = parentLabel.textContent ?? "";
    if (labelText) return labelText;
  }

  // 5. aria-describedby (descripciones adicionales)
  const ariaDescribedBy = input.getAttribute("aria-describedby");
  if (ariaDescribedBy) {
    const describedElement = document.getElementById(ariaDescribedBy);
    if (describedElement) return describedElement.textContent ?? "";
  }

  // 6. Buscar sibling label (label antes/después del input)
  const parent = input.parentElement;
  if (parent) {
    // Label como hermano anterior
    const prevLabel = parent.previousElementSibling;
    if (prevLabel?.tagName === "LABEL") {
      return prevLabel.textContent ?? "";
    }
    // Label como primer hijo
    const firstLabel = parent.querySelector(":scope > label");
    if (firstLabel) return firstLabel.textContent ?? "";
  }

  return "";
}

/**
 * Parsea el atributo autocomplete y devuelve el primer token relevante
 * El autocomplete puede tener múltiples tokens: "given-name billing home"
 * Nos interesa el primero que no sea "billing", "shipping", "off"
 */
function parseAutocompleteValue(input: HTMLInputElement): FieldType | null {
  const autocomplete = input.getAttribute("autocomplete");
  if (!autocomplete) return null;

  const tokens = autocomplete.toLowerCase().split(/\s+/);

  for (const token of tokens) {
    // Ignorar tokens que no son de tipo de campo
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
 * Busca atributos data-* que puedan indicar el tipo de campo
 * Común en testing: data-testid, data-cy, data-test, data-field
 */
function getDataAttributeHint(input: HTMLInputElement): string {
  const dataAttrs = ["data-testid", "data-cy", "data-test", "data-field", "data-name"];
  for (const attr of dataAttrs) {
    const value = input.getAttribute(attr);
    if (value) return value;
  }
  return "";
}

// Patrones RegExp para matching en texto libre (labels, placeholders, etc.)
// NOTA: Se去掉 acentos para mejor matching
const FIELD_PATTERNS: Record<FieldType, RegExp> = {
  email: /email|correo/i,
  firstName: /first.?name|nom(?:bre)?(?:de)?(?:primer)?|fname|pr(?:imer)?(?:nombre)?/i,
  lastName: /last.?name|apellido|lname|segundo(?:nombre)?|apellidos?/i,
  name: /^name$|full.?name|nom(?:bre)?(?:completo)?|nombre/i,
  phone: /phone|tel[eé]?fono?|mobile|cel(?:ular)?|whatsapp/i,
  address: /address|direcci[oó]n|street|domicilio|calle|num(?:ero)?|n[°o]?/i,
  city: /city|ciudad|poblaci[oó]n|municipio/i,
  state: /state|provincia|estado|regi[oó]n/i,
  country: /country|pa[ií]s|nacionalidad/i,
  zipCode: /zip|postal|cp|cep|pos(?:tal)?|c[oó]digo(?:postal)?/i,
  company: /company|empresa|organization|org(?:anizaci[oó]n)?|negocio/i,
  username: /user(?:name)?|usuario|login|account/i,
  password: /pass(?:word)?|contrase[nñ]a|clave|pin/i,
  date: /date|fecha|dob|birth(?:day)?|nacimiento/i,
  number: /number|cantidad|amount|count|cant|monto|edad|age/i,
  text: /.*/,
  unknown: /.*/,
};

/**
 * Detecta el tipo de campo usando una jerarquía de señales
 * Orden de prioridad (de mayor a menor):
 * 1. autocomplete token (más confiable - estándar HTML)
 * 2. label/aria-label/aria-labelledby
 * 3. name, id, placeholder
 * 4. input.type (fallback)
 */
export function detectFieldType(input: HTMLInputElement): FieldType {
  // 1. PRIORIDAD ALTA: Autocomplete token
  const autocompleteType = parseAutocompleteValue(input);
  if (autocompleteType) return autocompleteType;

  // 2. PRIORIDAD ALTA: aria-label (explícito)
  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel && FIELD_PATTERNS.text.test(ariaLabel)) {
    for (const [type, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (type === "text" || type === "unknown") continue;
      if (pattern.test(ariaLabel)) return type as FieldType;
    }
  }

  // 3. PRIORIDAD MEDIA: Label asociado
  const labelText = getLabelText(input);
  if (labelText) {
    // Limpiar label (quitar " *", ":", etc)
    const cleanLabel = labelText.replace(/[*:\s]+$/, "").trim();
    for (const [type, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (type === "text" || type === "unknown") continue;
      if (pattern.test(cleanLabel)) return type as FieldType;
    }
  }

  // 4. PRIORIDAD MEDIA: data-* attributes
  const dataHint = getDataAttributeHint(input);
  if (dataHint) {
    for (const [type, pattern] of Object.entries(FIELD_PATTERNS)) {
      if (type === "text" || type === "unknown") continue;
      if (pattern.test(dataHint)) return type as FieldType;
    }
  }

  // 5. PRIORIDAD BAJA: name, id, placeholder
  const signals = [
    input.name,
    input.id,
    input.placeholder,
  ].join(" ");

  for (const [type, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (type === "text" || type === "unknown") continue;
    if (pattern.test(signals)) return type as FieldType;
  }

  // 6. FALLBACK: input.type nativo
  if (input.type === "email") return "email";
  if (input.type === "tel") return "phone";
  if (input.type === "date") return "date";
  if (input.type === "number") return "number";
  if (input.type === "password") return "password";
  if (input.type === "search") return "text";

  return "text";
}
