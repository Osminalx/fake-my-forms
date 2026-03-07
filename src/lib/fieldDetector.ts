export type FieldType =
  | "email"
  | "name"
  | "firstName"
  | "lastName"
  | "phone"
  | "address"
  | "city"
  | "zipCode"
  | "company"
  | "username"
  | "password"
  | "date"
  | "number"
  | "text"
  | "unknown";

const FIELD_PATTERNS: Record<FieldType, RegExp> = {
  email: /email|correo/i,
  firstName: /first.?name|nombre|fname/i,
  lastName: /last.?name|apellido|lname/i,
  name: /^name$|full.?name|nombre.?completo/i,
  phone: /phone|tel[eé]?fono?|mobile|celular/i,
  address: /address|direcci[oó]n|street/i,
  city: /city|ciudad/i,
  zipCode: /zip|postal|cp\b/i,
  company: /company|empresa|organization/i,
  username: /user.?name|usuario/i,
  password: /password|contrase[nñ]a/i,
  date: /date|fecha/i,
  number: /number|cantidad|amount/i,
  text: /.*/,
  unknown: /.*/,
};

export function detectFieldType(input: HTMLInputElement): FieldType {
  const signals = [
    input.type,
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label") ?? "",
    input.getAttribute("autocomplete") ?? "",
  ].join(" ");

  for (const [type, pattern] of Object.entries(FIELD_PATTERNS)) {
    if (type === "text" || type === "unknown") continue;
    if (pattern.test(signals)) return type as FieldType;
  }

  // Fallback por input.type
  if (input.type === "email") return "email";
  if (input.type === "tel") return "phone";
  if (input.type === "date") return "date";
  if (input.type === "number") return "number";
  if (input.type === "password") return "password";

  return "text";
}
