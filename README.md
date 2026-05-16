# Fake My Forms

A browser extension built with WXT and Svelte that helps you fill out web forms with realistic fake data in seconds. Perfect for testing, prototyping, and development workflows.

## Features

### One-Click Form Filling
- Fill entire forms with a single click or keyboard shortcut
- Automatically detects form fields on any webpage
- Supports text inputs, textareas, selects, checkboxes, and more

### Smart Field Detection
- Intelligently identifies field types based on name, id, label, and placeholder
- Matches fields to appropriate data types (email fields get emails, names get names, etc.)

### Custom Fake Data
- Add your own custom fake data entries with probability weights
- Control how often specific values appear in your generated data
- Tailor the extension to your specific testing needs

### Powered by Faker.js
Generates realistic data across multiple categories:
- **Person**: Full names, first/last names, job titles, gender, bio
- **Location**: Addresses, cities, states, zip codes, countries, coordinates
- **Internet**: Emails, usernames, passwords, URLs, IP addresses
- **Finance**: Credit card numbers, account details, currency amounts
- **Dates**: Birthdates, past/future dates, timestamps
- **And more**: Phone numbers, UUIDs, images, and much more

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/fake_my_forms.git
cd fake_my_forms

# Install dependencies
npm install

# Start development server
npm run dev
```

### Loading the Extension

#### Chrome / Chromium-based browsers
1. Run `npm run dev` or `npm run build`
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3-dev` folder

#### Firefox
1. Run `npm run dev` or `npm run build`
2. Open `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in `.output/firefox-mv2-dev`

## Usage

1. **Open the extension** - Click the extension icon in your browser toolbar
2. **Configure your data** - Add custom fake data and set probability weights if needed
3. **Fill forms** - Click the "Fill Form" button or use the keyboard shortcut
4. **Watch it work** - Your form fields will be populated with realistic fake data

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Fill all forms | `Ctrl+Shift+F` |
| Fill visible forms | `Ctrl+Shift+V` |

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) - Next-gen browser extension framework
- **UI**: [Svelte](https://svelte.dev/) + TypeScript
- **Data Generation**: [@faker-js/faker](https://fakerjs.dev/)
- **Build Tool**: Vite

## Project Structure

```
fake_my_forms/
├── src/
│   ├── entrypoints/
│   │   ├── popup/          # Extension popup UI
│   │   ├── background.ts   # Background service worker
│   │   └── content.ts     # Content script (injected into pages)
│   └── lib/
│       ├── fakerEngine.ts  # Fake data generation logic
│       └── fieldDetector.ts # Form field detection
├── public/                  # Static assets (icons, etc.)
├── wxt.config.ts           # WXT configuration
└── package.json
```

## Adding a New Language

The extension detects form field types (email, name, address, etc.) by matching label text against language-specific patterns. Currently supports **English** (default) and **Spanish**. To add support for another language:

1. **Create the locale file** — `src/lib/locales/{lang}.ts`:

```typescript
import type { LocalePatterns } from "./index";

const patterns: LocalePatterns = {
  fieldPatterns: {
    firstName: [/\bnombre\b/, /\bprimer\b/],
    lastName: [/\bapellidos?\b/],
    email: [/\bcorreo\b/],
    // ... add only the patterns that differ from English
  },
  confirmPatterns: [/confirmar/i],
};

export default patterns;
```

2. **Register it** — add an export line in `src/lib/locales/index.ts`:

```typescript
import ja from "./ja";
// ... inside the registry:
"ja": ja,
```

3. **Add tests** — create `tests/unit/locales/{lang}.test.ts` verifying your patterns match correctly.

4. **Run tests** to make sure nothing breaks:

```bash
bun test tests/unit
```

That's it. No changes needed to the core detection logic. The extension auto-detects the page language from `<html lang>` and falls back to English if a locale file is missing.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
