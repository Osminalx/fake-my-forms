import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { detectFieldType } from "../../src/lib/fieldDetector";

// ---------------------------------------------------------------------------
// Basic input factory (no DOM attachment needed)
// ---------------------------------------------------------------------------
function makeInput(attrs: Partial<{
  type: string;
  name: string;
  id: string;
  placeholder: string;
  ariaLabel: string;
  autocomplete: string;
  dataTestid: string;
  dataCy: string;
  dataTest: string;
  dataField: string;
  dataName: string;
}>): HTMLInputElement {
  const input = document.createElement("input");
  if (attrs.type) input.type = attrs.type;
  if (attrs.name) input.name = attrs.name;
  if (attrs.id) input.id = attrs.id;
  if (attrs.placeholder) input.placeholder = attrs.placeholder;
  if (attrs.ariaLabel) input.setAttribute("aria-label", attrs.ariaLabel);
  if (attrs.autocomplete) input.autocomplete = attrs.autocomplete;
  if (attrs.dataTestid) input.setAttribute("data-testid", attrs.dataTestid);
  if (attrs.dataCy) input.setAttribute("data-cy", attrs.dataCy);
  if (attrs.dataTest) input.setAttribute("data-test", attrs.dataTest);
  if (attrs.dataField) input.setAttribute("data-field", attrs.dataField);
  if (attrs.dataName) input.setAttribute("data-name", attrs.dataName);
  return input;
}

// ---------------------------------------------------------------------------
// DOM-attached input factory (needed for label association strategies)
// Returns both the input and a cleanup function.
// ---------------------------------------------------------------------------
function makeInputInDOM(setup: (container: HTMLDivElement) => HTMLInputElement): {
  input: HTMLInputElement;
  cleanup: () => void;
} {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const input = setup(container);
  return {
    input,
    cleanup: () => document.body.removeChild(container),
  };
}

// ---------------------------------------------------------------------------
// EXISTING TESTS — name / id / placeholder patterns
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// EXISTING TESTS — input.type fallbacks
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// EXISTING TESTS — aria-label and autocomplete signals
// ---------------------------------------------------------------------------
describe("detectFieldType — aria-label and autocomplete signals", () => {
  it("detects via aria-label", () => {
    expect(detectFieldType(makeInput({ ariaLabel: "email address" }))).toBe("email");
  });

  it("detects email via autocomplete='email'", () => {
    expect(detectFieldType(makeInput({ autocomplete: "email" }))).toBe("email");
  });

  it("detects username via autocomplete='username'", () => {
    expect(detectFieldType(makeInput({ autocomplete: "username" }))).toBe("username");
  });
});

// ---------------------------------------------------------------------------
// EXISTING TESTS — text fallback
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// NEW: label association strategies
// ---------------------------------------------------------------------------
describe("detectFieldType — label associations", () => {
  // Strategy 3: label[for="id"]
  it("detects email via label[for] association", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-email-lbl">Email</label>
        <input id="test-email-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  it("detects firstName via label[for] with text 'First name'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-fname-lbl">First name</label>
        <input id="test-fname-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("firstName");
    cleanup();
  });

  it("detects lastName via label[for] with text 'Last name'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-lname-lbl">Last name</label>
        <input id="test-lname-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("lastName");
    cleanup();
  });

  it("detects phone via label[for] with text 'Phone number'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-phone-lbl">Phone number</label>
        <input id="test-phone-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("phone");
    cleanup();
  });

  it("detects zipCode via label[for] with Spanish 'Código postal'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-zip-lbl">Código postal</label>
        <input id="test-zip-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("zipCode");
    cleanup();
  });

  it("strips trailing '*' and ':' from label text before matching", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-req-lbl">Email *:</label>
        <input id="test-req-lbl" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  // Strategy 2: aria-labelledby
  it("detects company via aria-labelledby referencing a span", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <span id="test-company-span">Company</span>
        <input aria-labelledby="test-company-span" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("company");
    cleanup();
  });

  it("detects username via aria-labelledby referencing a heading", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <h3 id="test-user-heading">Username</h3>
        <input aria-labelledby="test-user-heading" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("username");
    cleanup();
  });

  // Strategy 4: input wrapped inside <label>
  it("detects email via parent <label> wrapping", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label>Email address<input /></label>
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  it("detects firstName via parent <label> wrapping with Spanish 'Nombre'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label>Nombre<input /></label>
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("firstName");
    cleanup();
  });

  it("detects lastName via parent <label> wrapping with 'Apellido'", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label>Apellido<input /></label>
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("lastName");
    cleanup();
  });

  // Strategy 5: aria-describedby fallback
  it("detects phone via aria-describedby when no other label exists", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <span id="test-phone-desc">Phone number</span>
        <input aria-describedby="test-phone-desc" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("phone");
    cleanup();
  });

  // Strategy 6: sibling label before parent element
  it("detects address via sibling <label> before parent div", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label>Address</label>
        <div><input /></div>
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("address");
    cleanup();
  });
});

// ---------------------------------------------------------------------------
// NEW: data-* attribute hints
// ---------------------------------------------------------------------------
describe("detectFieldType — data-* attribute hints", () => {
  it("detects email via data-testid='email-input'", () => {
    expect(detectFieldType(makeInput({ dataTestid: "email-input" }))).toBe("email");
  });

  it("detects phone via data-cy='phone-field'", () => {
    expect(detectFieldType(makeInput({ dataCy: "phone-field" }))).toBe("phone");
  });

  it("detects firstName via data-test='firstName'", () => {
    expect(detectFieldType(makeInput({ dataTest: "firstName" }))).toBe("firstName");
  });

  it("detects address via data-field='address'", () => {
    expect(detectFieldType(makeInput({ dataField: "address" }))).toBe("address");
  });

  it("detects zipCode via data-name='zipCode'", () => {
    expect(detectFieldType(makeInput({ dataName: "zipCode" }))).toBe("zipCode");
  });

  it("detects password via data-testid='password-field'", () => {
    expect(detectFieldType(makeInput({ dataTestid: "password-field" }))).toBe("password");
  });

  it("detects company via data-cy='company-input'", () => {
    expect(detectFieldType(makeInput({ dataCy: "company-input" }))).toBe("company");
  });

  it("detects username via data-field='username'", () => {
    expect(detectFieldType(makeInput({ dataField: "username" }))).toBe("username");
  });

  it("detects lastName via data-testid='last-name'", () => {
    expect(detectFieldType(makeInput({ dataTestid: "last-name" }))).toBe("lastName");
  });

  it("detects city via data-cy='city-field'", () => {
    expect(detectFieldType(makeInput({ dataCy: "city-field" }))).toBe("city");
  });
});

// ---------------------------------------------------------------------------
// NEW: full autocomplete token coverage
// ---------------------------------------------------------------------------
describe("detectFieldType — full autocomplete token coverage", () => {
  // First-name tokens
  it("given-name → firstName", () => {
    expect(detectFieldType(makeInput({ autocomplete: "given-name" }))).toBe("firstName");
  });

  it("additional-name → firstName (middle name treated as firstName)", () => {
    expect(detectFieldType(makeInput({ autocomplete: "additional-name" }))).toBe("firstName");
  });

  // Last-name token
  it("family-name → lastName", () => {
    expect(detectFieldType(makeInput({ autocomplete: "family-name" }))).toBe("lastName");
  });

  // Phone tokens
  it("tel → phone", () => {
    expect(detectFieldType(makeInput({ autocomplete: "tel" }))).toBe("phone");
  });

  it("tel-national → phone", () => {
    expect(detectFieldType(makeInput({ autocomplete: "tel-national" }))).toBe("phone");
  });

  it("tel-area-code → phone", () => {
    expect(detectFieldType(makeInput({ autocomplete: "tel-area-code" }))).toBe("phone");
  });

  it("tel-local → phone", () => {
    expect(detectFieldType(makeInput({ autocomplete: "tel-local" }))).toBe("phone");
  });

  it("tel-country-code → phone", () => {
    expect(detectFieldType(makeInput({ autocomplete: "tel-country-code" }))).toBe("phone");
  });

  // Address tokens
  it("street-address → address", () => {
    expect(detectFieldType(makeInput({ autocomplete: "street-address" }))).toBe("address");
  });

  it("address-line1 → address", () => {
    expect(detectFieldType(makeInput({ autocomplete: "address-line1" }))).toBe("address");
  });

  it("address-line2 → address", () => {
    expect(detectFieldType(makeInput({ autocomplete: "address-line2" }))).toBe("address");
  });

  // City tokens
  it("address-level2 → city", () => {
    expect(detectFieldType(makeInput({ autocomplete: "address-level2" }))).toBe("city");
  });

  it("address-level3 → city", () => {
    expect(detectFieldType(makeInput({ autocomplete: "address-level3" }))).toBe("city");
  });

  // State token
  it("address-level1 → state", () => {
    expect(detectFieldType(makeInput({ autocomplete: "address-level1" }))).toBe("state");
  });

  // ZIP tokens
  it("postal-code → zipCode", () => {
    expect(detectFieldType(makeInput({ autocomplete: "postal-code" }))).toBe("zipCode");
  });

  // Country tokens
  it("country → country", () => {
    expect(detectFieldType(makeInput({ autocomplete: "country" }))).toBe("country");
  });

  it("country-name → country", () => {
    expect(detectFieldType(makeInput({ autocomplete: "country-name" }))).toBe("country");
  });

  // Company tokens
  it("organization → company", () => {
    expect(detectFieldType(makeInput({ autocomplete: "organization" }))).toBe("company");
  });

  it("organization-title → company", () => {
    expect(detectFieldType(makeInput({ autocomplete: "organization-title" }))).toBe("company");
  });

  // Password tokens
  it("current-password → password", () => {
    expect(detectFieldType(makeInput({ autocomplete: "current-password" }))).toBe("password");
  });

  it("new-password → password", () => {
    expect(detectFieldType(makeInput({ autocomplete: "new-password" }))).toBe("password");
  });

  // Credit-card tokens
  it("cc-name → name", () => {
    expect(detectFieldType(makeInput({ autocomplete: "cc-name" }))).toBe("name");
  });

  it("cc-number → number", () => {
    expect(detectFieldType(makeInput({ autocomplete: "cc-number" }))).toBe("number");
  });

  it("cc-exp → date", () => {
    expect(detectFieldType(makeInput({ autocomplete: "cc-exp" }))).toBe("date");
  });

  it("cc-exp-month → number", () => {
    expect(detectFieldType(makeInput({ autocomplete: "cc-exp-month" }))).toBe("number");
  });

  it("cc-exp-year → number", () => {
    expect(detectFieldType(makeInput({ autocomplete: "cc-exp-year" }))).toBe("number");
  });

  // Compound tokens — billing/shipping prefixes must be skipped
  it("'billing given-name' → firstName (billing prefix is ignored)", () => {
    expect(detectFieldType(makeInput({ autocomplete: "billing given-name" }))).toBe("firstName");
  });

  it("'shipping family-name' → lastName (shipping prefix is ignored)", () => {
    expect(detectFieldType(makeInput({ autocomplete: "shipping family-name" }))).toBe("lastName");
  });

  it("'billing postal-code' → zipCode", () => {
    expect(detectFieldType(makeInput({ autocomplete: "billing postal-code" }))).toBe("zipCode");
  });

  it("'shipping street-address' → address", () => {
    expect(detectFieldType(makeInput({ autocomplete: "shipping street-address" }))).toBe("address");
  });

  // 'off' and 'on' tokens must be skipped entirely
  it("autocomplete='off' falls through to name-based detection", () => {
    expect(detectFieldType(makeInput({ autocomplete: "off", name: "email" }))).toBe("email");
  });

  it("autocomplete='on' falls through to name-based detection", () => {
    expect(detectFieldType(makeInput({ autocomplete: "on", name: "phone" }))).toBe("phone");
  });
});

// ---------------------------------------------------------------------------
// NEW: missing field type patterns (state, country, date, number)
// ---------------------------------------------------------------------------
describe("detectFieldType — missing field type patterns", () => {
  // state
  it("detects state via name='state'", () => {
    expect(detectFieldType(makeInput({ name: "state" }))).toBe("state");
  });

  it("detects state via 'provincia'", () => {
    expect(detectFieldType(makeInput({ placeholder: "provincia" }))).toBe("state");
  });

  it("detects state via 'estado'", () => {
    expect(detectFieldType(makeInput({ name: "estado" }))).toBe("state");
  });

  it("detects state via 'region'", () => {
    expect(detectFieldType(makeInput({ id: "region" }))).toBe("state");
  });

  // country
  it("detects country via name='country'", () => {
    expect(detectFieldType(makeInput({ name: "country" }))).toBe("country");
  });

  it("detects country via 'pais'", () => {
    expect(detectFieldType(makeInput({ placeholder: "pais" }))).toBe("country");
  });

  it("detects country via 'nacionalidad'", () => {
    expect(detectFieldType(makeInput({ id: "nacionalidad" }))).toBe("country");
  });

  // date
  it("detects date via name='date'", () => {
    expect(detectFieldType(makeInput({ name: "date" }))).toBe("date");
  });

  it("detects date via 'fecha'", () => {
    expect(detectFieldType(makeInput({ placeholder: "fecha" }))).toBe("date");
  });

  it("detects date via 'dob'", () => {
    expect(detectFieldType(makeInput({ name: "dob" }))).toBe("date");
  });

  it("detects date via 'birthday'", () => {
    expect(detectFieldType(makeInput({ id: "birthday" }))).toBe("date");
  });

  it("detects date via 'nacimiento'", () => {
    expect(detectFieldType(makeInput({ placeholder: "nacimiento" }))).toBe("date");
  });

  // number
  it("detects number via name='number'", () => {
    expect(detectFieldType(makeInput({ name: "number" }))).toBe("number");
  });

  it("detects number via 'amount'", () => {
    expect(detectFieldType(makeInput({ name: "amount" }))).toBe("number");
  });

  it("detects number via 'edad'", () => {
    expect(detectFieldType(makeInput({ placeholder: "edad" }))).toBe("number");
  });

  it("detects number via 'monto'", () => {
    expect(detectFieldType(makeInput({ id: "monto" }))).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// NEW: signal priority ordering
// ---------------------------------------------------------------------------
describe("detectFieldType — signal priority ordering", () => {
  // autocomplete beats aria-label
  it("autocomplete beats aria-label when they conflict", () => {
    // autocomplete says email, aria-label says username
    const input = makeInput({ autocomplete: "email", ariaLabel: "Username" });
    expect(detectFieldType(input)).toBe("email");
  });

  // autocomplete beats label[for]
  it("autocomplete beats label[for] text when they conflict", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-prio-1">Username</label>
        <input id="test-prio-1" autocomplete="email" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  // autocomplete beats name/id
  it("autocomplete beats name attribute when they conflict", () => {
    const input = makeInput({ autocomplete: "family-name", name: "email" });
    expect(detectFieldType(input)).toBe("lastName");
  });

  // aria-label beats label[for]
  it("aria-label beats label[for] text when they conflict", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-prio-2">Username</label>
        <input id="test-prio-2" aria-label="Email address" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  // label[for] beats name/id
  it("label[for] beats name attribute when they conflict", () => {
    const { input, cleanup } = makeInputInDOM((container) => {
      container.innerHTML = `
        <label for="test-prio-3">Email address</label>
        <input id="test-prio-3" name="username" />
      `;
      return container.querySelector("input")!;
    });
    expect(detectFieldType(input)).toBe("email");
    cleanup();
  });

  // data-* beats name/id
  it("data-testid beats name attribute when they conflict", () => {
    // data-testid says phone, name says email
    const input = makeInput({ dataTestid: "phone-field", name: "email_addr" });
    expect(detectFieldType(input)).toBe("phone");
  });

  it("data-cy beats id attribute when they conflict", () => {
    const input = makeInput({ dataCy: "company-field", id: "email" });
    expect(detectFieldType(input)).toBe("company");
  });

  // input.type is the last resort
  it("input.type=email is used only when no other signal matches", () => {
    const input = document.createElement("input");
    input.type = "email";
    expect(detectFieldType(input)).toBe("email");
  });

  it("name/id signal overrides input.type fallback", () => {
    // type=number but name=email → name wins before type fallback is reached
    const input = makeInput({ type: "number", name: "email" });
    expect(detectFieldType(input)).toBe("email");
  });
});
