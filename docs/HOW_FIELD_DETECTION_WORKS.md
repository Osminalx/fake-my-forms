# How Field Detection Works

When you press **Alt+Shift+F**, the extension scans every visible input on the page and decides what kind of data to fill in — email, phone number, first name, etc. This document explains *how* it figures that out.

---

## The big idea: clues, not mind-reading

The extension can't look at an input and magically know it's for an email address. Instead, it reads **clues** that developers leave in the HTML. Some clues are very reliable (a developer explicitly saying "this is an email field"), others are fuzzy (guessing from the field's name attribute).

The detector tries clues in order from most reliable to least, and stops as soon as one matches:

```
1. autocomplete attribute   ← most reliable
2. aria-label attribute
3. Associated label text
4. data-* test attributes
5. name / id / placeholder
6. input type attribute     ← last resort
```

---

## Clue #1 — The `autocomplete` attribute

This is the gold standard. It's an official HTML standard where developers tell the browser exactly what a field is for.

**Example in HTML:**
```html
<input type="text" autocomplete="given-name" />
<input type="text" autocomplete="family-name" />
<input type="email" autocomplete="email" />
```

The `autocomplete` attribute has a fixed vocabulary of tokens defined by the HTML spec. The extension maps every token to a field type:

| autocomplete token | Detected as |
|--------------------|-------------|
| `given-name` | firstName |
| `family-name` | lastName |
| `email` | email |
| `tel`, `tel-national`, `tel-local` | phone |
| `street-address`, `address-line1` | address |
| `address-level1` | state |
| `address-level2` | city |
| `postal-code` | zipCode |
| `country`, `country-name` | country |
| `organization` | company |
| `username` | username |
| `current-password`, `new-password` | password |
| `cc-name` | name |
| `cc-number` | number |
| `cc-exp` | date |

### Compound tokens

The attribute can have multiple space-separated tokens. Prefixes like `billing` and `shipping` are just context — the field type comes from the second token:

```html
<!-- "billing" is context, "given-name" is the field type → firstName -->
<input autocomplete="billing given-name" />

<!-- "shipping" is context, "postal-code" is the field type → zipCode -->
<input autocomplete="shipping postal-code" />
```

The detector skips `billing`, `shipping`, `off`, and `on`, then uses the first remaining token it recognizes.

### `autocomplete="off"` or `autocomplete="on"`

These tell the browser to disable/enable its autofill suggestions but say nothing about *what* the field is. The detector ignores them and falls through to the next clue.

---

## Clue #2 — `aria-label`

ARIA (Accessible Rich Internet Applications) is a set of HTML attributes designed to help screen readers understand a page. `aria-label` lets a developer attach a human-readable name directly to an element.

**Example in HTML:**
```html
<!-- No visible label, but the screen reader (and our detector) can read this -->
<input aria-label="Email address" />
<input aria-label="Contraseña" type="password" />
```

The detector reads this text and matches it against known patterns (e.g. "contraseña" → password, "email" → email).

---

## Clue #3 — Associated label text

This covers the many ways an HTML `<label>` element can be connected to an input. There are four strategies, tried in order:

### Strategy A: `aria-labelledby`

Points to the ID of another element whose text should be used as the label:

```html
<span id="company-title">Company name</span>
<input aria-labelledby="company-title" />
<!-- reads "Company name" from the span → company -->
```

### Strategy B: `label[for="id"]`

The classic, most common approach — a `<label>` with a `for` attribute pointing to the input's `id`:

```html
<label for="user-email">Email address</label>
<input id="user-email" />
<!-- reads "Email address" from the label → email -->
```

### Strategy C: Input wrapped inside a `<label>`

No `for`/`id` needed — the input is a child of the label:

```html
<label>
  First name
  <input type="text" />
</label>
<!-- reads "First name" from the parent label → firstName -->
```

### Strategy D: `aria-describedby`

A fallback used for hint text (e.g. "Enter your 10-digit phone number"). Not as strong a signal as a label, but still useful:

```html
<span id="phone-hint">Phone number</span>
<input aria-describedby="phone-hint" />
<!-- reads "Phone number" → phone -->
```

### Strategy E: Sibling `<label>` before the parent

Some forms wrap inputs in divs with the label as a preceding sibling:

```html
<label>Address</label>
<div><input /></div>
<!-- reads "Address" from the previous sibling label → address -->
```

Before matching, the detector strips trailing ` *`, `:`, and extra whitespace from label text (common in "required field" markers like `Email *:`).

---

## Clue #4 — `data-*` test attributes

Developers often add custom `data-*` attributes to make automated testing easier (e.g. Cypress, Testing Library). These frequently contain field names:

```html
<input data-testid="email-input" />   <!-- → email -->
<input data-cy="phone-field" />       <!-- → phone -->
<input data-test="firstName" />       <!-- → firstName -->
<input data-field="address" />        <!-- → address -->
<input data-name="zipCode" />         <!-- → zipCode -->
```

The detector checks these attributes in the order listed above and matches the value against the same field patterns.

---

## Clue #5 — `name`, `id`, and `placeholder`

The most common attributes developers use to identify fields in their own code. Less reliable because they're written for the developer's convenience, not for machine reading — but usually descriptive enough:

```html
<input name="email" />
<input id="firstName" />
<input placeholder="Enter your phone number" />
```

All three values are combined into a single string and tested against pattern lists for each field type. Patterns support both English and Spanish keywords.

---

## Clue #6 — `input type` (last resort)

The browser's built-in `type` attribute says something about the *format* of the data, not what it represents — but it's still a useful hint when all else fails:

| `type=` | Detected as |
|---------|-------------|
| `email` | email |
| `tel` | phone |
| `date` | date |
| `number` | number |
| `password` | password |
| `search`, anything else | text |

---

## Pattern matching and language support

For clues #2–#5 (anything text-based), the detector uses regular expressions that cover both English and Spanish terms. A few examples:

| Field | Matched keywords |
|-------|-----------------|
| email | `email`, `correo` |
| firstName | `first name`, `fname`, `nombre`, `primer nombre` |
| lastName | `last name`, `lname`, `apellido` |
| phone | `phone`, `mobile`, `teléfono`, `celular`, `whatsapp` |
| address | `address`, `street`, `dirección`, `domicilio`, `calle` |
| zipCode | `zip`, `postal`, `cp`, `código postal` |
| password | `password`, `contraseña`, `clave`, `pin` |
| date | `date`, `fecha`, `dob`, `birthday`, `nacimiento` |

---

## Why priority order matters

Consider a poorly built form where clues conflict:

```html
<label for="x">Username</label>
<input id="x" autocomplete="email" />
```

The label says "Username" but `autocomplete="email"` is a stronger, explicit signal. The detector returns **email** because `autocomplete` has higher priority than label text.

Another example:

```html
<label for="y">Email address</label>
<input id="y" name="username" />
```

Here `autocomplete` is absent, so label text wins over `name`. The detector returns **email** because label text (clue #3) beats name/id (clue #5).

---

## What happens when nothing matches

If no clue identifies the field, the detector returns `"text"` — and the extension fills it with a random lorem-ipsum-style sentence. Invisible inputs (type `hidden`, `submit`, `button`, `checkbox`, `radio`) are skipped entirely.
