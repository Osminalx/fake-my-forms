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
  // Busca label como hermano directo O dentro del elemento hermano
  const parent = input.parentElement;
  if (parent) {
    // Label como hermano anterior directo
    const prevLabel = parent.previousElementSibling;
    if (prevLabel?.tagName === "LABEL") {
      return prevLabel.textContent ?? "";
    }
    // Label como primer hijo del hermano anterior
    const prevLabelChild = prevLabel?.querySelector(":scope > label");
    if (prevLabelChild) return prevLabelChild.textContent ?? "";
    // Label como cualquier descendant del hermano anterior (estructura: div > div > label)
    const prevLabelNested = prevLabel?.querySelector("label");
    if (prevLabelNested) return prevLabelNested.textContent ?? "";

    // Label como primer hijo directo del parent
    const firstLabel = parent.querySelector(":scope > label");
    if (firstLabel) return firstLabel.textContent ?? "";
    // Label como cualquier descendant del parent
    const nestedLabel = parent.querySelector("label");
    if (nestedLabel) return nestedLabel.textContent ?? "";
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
// IMPORTANTE: Usamos \b (word boundaries) para evitar falsos positivos
// Ejemplo: "Card Holders Full Name" NO debe matchear con "name" porque "name" no es una palabra completa
// Pero permitimos algunos casos especiales como "fullName" que contiene "lname"
const FIELD_PATTERNS: Record<FieldType, RegExp> = {
  // Casos específicos primero (para que "Name" -> firstName, no "name")
  // Usamos boundaries para evitar substring matches en texto normal
  // Pero permitimos "fullName" que es un caso común
  firstName: /\b(first.?name|firstname|fname)\b|^(nombre)$|^(Nombre)$|^(Name)$|\bnombre\b|\bprimer\b/i,
  lastName: /\b(last.?name|lastname|lname|fullname)\b|^(apellido)$|^(Apellido)$|^(Lastname)$|^(Last Name)$|\bsurname\b|\bapellidos?\b/i,
  
  // Name genérico (después de firstName/lastName para evitar colisiones)
  // Usamos boundary al inicio pero no al final para capturar "full name" o "Name" al final
  name: /\bname$|\bfull.?name\b/i,
  
  // Resto de campos - todos con word boundaries
  // Para zipCode permitimos "zipCode" como caso especial (data attributes)
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

// Orden de verificación: primero específicos, luego genéricos
// Esto asegura que "Name" → firstName (no name), "Lastname" → lastName (no text)
const FIELD_TYPE_PRIORITY: FieldType[] = [
  "firstName", "lastName", // específicos van primero
  "name", // genérico después
  "email", "phone", "address", "city", "state", "country", "zipCode", "company", "username", "password", "date", "number",
  "text", "unknown",
];

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

  // Función helper para verificar si un tipo matchea usando la prioridad correcta
  const matches = (type: FieldType, text: string): boolean => {
    if (type === "text" || type === "unknown") return false;
    return FIELD_PATTERNS[type].test(text);
  };

  // 2. PRIORIDAD ALTA: aria-label (explícito)
  const ariaLabel = input.getAttribute("aria-label");
  if (ariaLabel) {
    for (const type of FIELD_TYPE_PRIORITY) {
      if (matches(type, ariaLabel)) return type;
    }
  }

  // 3. PRIORIDAD MEDIA: Label asociado
  const labelText = getLabelText(input);
  if (labelText) {
    // Limpiar label (quitar " *", ":", etc)
    const cleanLabel = labelText.replace(/[*:\s]+$/, "").trim();
    for (const type of FIELD_TYPE_PRIORITY) {
      if (matches(type, cleanLabel)) return type;
    }
  }

  // 4. PRIORIDAD MEDIA: data-* attributes
  const dataHint = getDataAttributeHint(input);
  if (dataHint) {
    for (const type of FIELD_TYPE_PRIORITY) {
      if (matches(type, dataHint)) return type;
    }
  }

  // 5. PRIORIDAD BAJA: name, id, placeholder
  const signals = [
    input.name,
    input.id,
    input.placeholder,
  ].join(" ");

  for (const type of FIELD_TYPE_PRIORITY) {
    if (matches(type, signals)) return type;
  }

  // 6. FALLBACK: input.type nativo
  // IMPORTANTE: retornamos "unknown" (no fill) en lugar de "text" (lorem ipsum)
  // para evitar filling incorrecto cuando no podemos detectar el tipo
  if (input.type === "email") return "email";
  if (input.type === "tel") return "phone";
  if (input.type === "date") return "date";
  if (input.type === "number") return "number";
  if (input.type === "password") return "password";
  if (input.type === "search") return "text";

  return "unknown";
}
