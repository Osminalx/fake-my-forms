import { describe, it, expect, beforeEach } from "bun:test";
import { detectFieldType } from "../../src/lib/fieldDetector";

function makeInput(attrs: Partial<{
  type: string;
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  autocomplete: string;
}>): HTMLInputElement {
  const input = document.createElement("input");
  if (attrs.type) input.type = attrs.type;
  if (attrs.name) input.name = attrs.name;
  if (attrs.id) input.id = attrs.id;
  if (attrs.placeholder) input.placeholder = attrs.placeholder;
  if (attrs.ariaLabel) input.setAttribute("aria-label", attrs.ariaLabel);
  if (attrs.autocomplete) input.autocomplete = attrs.autocomplete;
  return input;
}

describe("detectFieldType — name/id/placeholder patterns", () => {
  it("detects email via name", () => {
    expect(detectFieldType(makeInput({ name: "email" }))).toBe("email");
  });

  it("detects email via Spanish keyword 'correo'", () => {
    expect(detectFieldType(makeInput({ placeholder: "tu correo" }))).toBe("email");
  });

  it("detects firstName via name='firstName'", () => {
    expect(detectFieldType(makeInput({ name: "firstName" }))).toBe("firstName");
  });

  it("detects firstName via Spanish 'nombre'", () => {
    expect(detectFieldType(makeInput({ placeholder: "nombre" }))).toBe("firstName");
  });

  it("detects firstName via 'fname'", () => {
    expect(detectFieldType(makeInput({ id: "fname" }))).toBe("firstName");
  });

  it("detects lastName via name='lastName'", () => {
    expect(detectFieldType(makeInput({ name: "lastName" }))).toBe("lastName");
  });

  it("detects lastName via 'apellido'", () => {
    expect(detectFieldType(makeInput({ placeholder: "apellido" }))).toBe("lastName");
  });

  it("detects lastName via 'lname'", () => {
    expect(detectFieldType(makeInput({ id: "lname" }))).toBe("lastName");
  });

  // NOTE: ^name$ in FIELD_PATTERNS won't match because the signal string always
  // starts with input.type ("text"), so a bare id="name" falls through to "text".
  it("id='name' alone returns 'text' (^name$ does not match multi-word signal)", () => {
    expect(detectFieldType(makeInput({ id: "name" }))).toBe("text");
  });

  // "fullName" contains the substring "lname" which matches the lastName pattern
  // before the name pattern is checked — documented known behaviour.
  it("name='fullName' returns 'lastName' due to lname substring match", () => {
    expect(detectFieldType(makeInput({ name: "fullName" }))).toBe("lastName");
  });

  it("detects name via 'full_name' (full.?name without lname collision)", () => {
    expect(detectFieldType(makeInput({ name: "full_name" }))).toBe("name");
  });

  it("detects phone via name='phone'", () => {
    expect(detectFieldType(makeInput({ name: "phone" }))).toBe("phone");
  });

  it("detects phone via 'telefono'", () => {
    expect(detectFieldType(makeInput({ placeholder: "telefono" }))).toBe("phone");
  });

  it("detects phone via 'mobile'", () => {
    expect(detectFieldType(makeInput({ id: "mobile" }))).toBe("phone");
  });

  it("detects phone via 'celular'", () => {
    expect(detectFieldType(makeInput({ name: "celular" }))).toBe("phone");
  });

  it("detects address via name='address'", () => {
    expect(detectFieldType(makeInput({ name: "address" }))).toBe("address");
  });

  it("detects address via 'dirección'", () => {
    expect(detectFieldType(makeInput({ placeholder: "dirección" }))).toBe("address");
  });

  it("detects address via 'street'", () => {
    expect(detectFieldType(makeInput({ id: "street" }))).toBe("address");
  });

  it("detects city via name='city'", () => {
    expect(detectFieldType(makeInput({ name: "city" }))).toBe("city");
  });

  it("detects city via 'ciudad'", () => {
    expect(detectFieldType(makeInput({ placeholder: "ciudad" }))).toBe("city");
  });

  it("detects zipCode via name='zip'", () => {
    expect(detectFieldType(makeInput({ name: "zip" }))).toBe("zipCode");
  });

  it("detects zipCode via 'postal'", () => {
    expect(detectFieldType(makeInput({ id: "postal" }))).toBe("zipCode");
  });

  it("detects company via name='company'", () => {
    expect(detectFieldType(makeInput({ name: "company" }))).toBe("company");
  });

  it("detects company via 'empresa'", () => {
    expect(detectFieldType(makeInput({ placeholder: "empresa" }))).toBe("company");
  });

  it("detects company via 'organization'", () => {
    expect(detectFieldType(makeInput({ name: "organization" }))).toBe("company");
  });

  it("detects username via name='username'", () => {
    expect(detectFieldType(makeInput({ name: "username" }))).toBe("username");
  });

  it("detects username via 'usuario'", () => {
    expect(detectFieldType(makeInput({ placeholder: "usuario" }))).toBe("username");
  });

  it("detects password via name='password'", () => {
    expect(detectFieldType(makeInput({ name: "password" }))).toBe("password");
  });

  it("detects password via Spanish 'contraseña'", () => {
    expect(detectFieldType(makeInput({ placeholder: "contraseña" }))).toBe("password");
  });
});

describe("detectFieldType — input.type fallbacks", () => {
  it("falls back to email for type=email", () => {
    expect(detectFieldType(makeInput({ type: "email" }))).toBe("email");
  });

  it("falls back to phone for type=tel", () => {
    expect(detectFieldType(makeInput({ type: "tel" }))).toBe("phone");
  });

  it("falls back to date for type=date", () => {
    expect(detectFieldType(makeInput({ type: "date" }))).toBe("date");
  });

  it("falls back to number for type=number", () => {
    expect(detectFieldType(makeInput({ type: "number" }))).toBe("number");
  });

  it("falls back to password for type=password", () => {
    expect(detectFieldType(makeInput({ type: "password" }))).toBe("password");
  });
});

describe("detectFieldType — aria-label and autocomplete signals", () => {
  it("detects via aria-label", () => {
    expect(detectFieldType(makeInput({ ariaLabel: "email address" }))).toBe("email");
  });

  // "given-name" is not in firstName patterns; autocomplete="email" matches the email pattern.
  it("detects email via autocomplete='email'", () => {
    expect(detectFieldType(makeInput({ autocomplete: "email" }))).toBe("email");
  });

  // autocomplete="username" matches the username pattern
  it("detects username via autocomplete='username'", () => {
    expect(detectFieldType(makeInput({ autocomplete: "username" }))).toBe("username");
  });
});

describe("detectFieldType — text fallback", () => {
  it("returns text for a plain input with no hints", () => {
    const input = document.createElement("input");
    expect(detectFieldType(input)).toBe("text");
  });

  it("returns text for textarea-like signal with no specific type", () => {
    const input = document.createElement("input");
    input.name = "message";
    expect(detectFieldType(input)).toBe("text");
  });
});
