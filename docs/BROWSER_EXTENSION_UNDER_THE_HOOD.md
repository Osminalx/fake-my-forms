# Browser extensions under the hood

This document explains how this extension works internally and why the error
`TypeError: can't access property "sync", browser.storage is undefined` happens.

## 1) Execution contexts

Browser extensions are split across isolated runtime contexts:

- Popup UI: the `src/entrypoints/popup` Svelte app rendered when you click the extension icon.
- Content script: `src/entrypoints/content.ts`, injected into web pages to read and write form fields.
- Background/service worker: `src/entrypoints/background.ts`, a long-lived extension runtime context for event handling.

These contexts do not share JavaScript scope directly. They communicate via extension APIs (mostly messages and storage).

## 2) Message flow in this project

Current form fill flow is:

1. User clicks "fill" in the popup (or uses the keyboard shortcut in page context).
2. Content script receives a `FILL_FORM` message or hotkey event.
3. Content script reads config from extension storage.
4. Content script scans inputs and writes fake values.

The content script is the only place that can directly touch page DOM fields.

## 3) Why `browser.storage` can be undefined

Extension APIs are permission-gated by the manifest.

- If `storage` permission is missing, `storage` APIs may not be available in a given browser/runtime.
- The `browser.storage.sync` area can also be unavailable in some contexts, or blocked temporarily (sync disabled, browser profile limits, enterprise policies, private mode restrictions).

That means robust code should:

- declare `storage` in manifest permissions,
- try `sync` first when desired,
- fallback to `local` when needed,
- fallback to defaults when storage is unavailable.

## 4) Storage model: `sync` vs `local`

- `storage.local`: stored on-device, larger quota, no cross-device sync.
- `storage.sync`: smaller quota, synchronized across signed-in browser profiles (when enabled).

Recommended pattern for config:

- Use `sync` for lightweight user settings.
- Fallback to `local` if `sync` is unavailable.
- Always handle empty/missing config safely.

## 5) Manifest as capability gate

In modern extensions, the manifest is your capability declaration. If a capability is not declared, code may compile but fail at runtime.

For this project, `wxt.config.ts` should include:

- `manifest.permissions: ['storage']`

Without it, reading config from `browser.storage` is not reliable.

## 6) How to debug extension APIs fast

### Chromium

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load/reload the unpacked extension.
4. Open:
   - popup devtools (inspect popup),
   - service worker devtools (background),
   - page devtools (content script logs in target tab).

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Load temporary add-on from build output.
3. Use "Inspect" on the extension for background/popup logs.
4. Open target page devtools for content-script behavior.

### Quick checks for this bug

- Confirm `storage` appears in generated manifest permissions.
- In content script console, verify `browser.storage` object exists.
- Trigger `Alt+Shift+F` and verify no storage-related exception is thrown.

## 7) Mental model to keep in mind

- Popup controls intent.
- Content script performs DOM work.
- Background coordinates extension-wide tasks.
- Storage persists shared state between isolated contexts.

When an API error appears, verify permissions first, then verify context, then add fallbacks.
