// mock.module must be called before @testing-library/svelte or svelte itself is loaded.
// Bun resolves the "svelte" bare import to index-server.js (default export condition)
// because it does not activate the "browser" condition in test environments.
// Redirect it to the client bundle so mount(), onMount(), etc. all work correctly.
import { mock } from "bun:test";

mock.module("svelte", () => import("../node_modules/svelte/src/index-client.js"));

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import "@testing-library/jest-dom";

GlobalRegistrator.register();

// happy-dom's HTMLInputElement / HTMLTextAreaElement value setters use private class
// fields (#selectionStart) that Bun's JSC engine rejects when those setters are
// invoked via Object.getOwnPropertyDescriptor(...).set.call(el, value) — which is
// exactly the pattern fillInput() uses to trigger framework change-detection.
// Replace both prototype descriptors with a WeakMap-backed shim.
const _elementValues = new WeakMap<object, string>();

function patchValueDescriptor(proto: object) {
  Object.defineProperty(proto, "value", {
    get(this: HTMLInputElement | HTMLTextAreaElement): string {
      return _elementValues.get(this) ?? "";
    },
    set(this: HTMLInputElement | HTMLTextAreaElement, v: string) {
      _elementValues.set(this, String(v));
    },
    configurable: true,
    enumerable: true,
  });
}

patchValueDescriptor(HTMLInputElement.prototype);
patchValueDescriptor(HTMLTextAreaElement.prototype);
