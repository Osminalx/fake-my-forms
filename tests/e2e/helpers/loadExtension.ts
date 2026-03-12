import { chromium, firefox, type BrowserContext } from "@playwright/test";
import path from "path";

const CHROME_EXT = path.resolve(process.cwd(), ".output/chrome-mv3");
const FIREFOX_EXT = path.resolve(process.cwd(), ".output/firefox-mv2");

/**
 * Launch a persistent Chromium context with the MV3 extension loaded.
 * Returns the context and a helper to derive the extension's popup URL.
 */
export async function chromiumContext(): Promise<{
  context: BrowserContext;
  popupUrl: () => string;
}> {
  const userDataDir = path.join(process.cwd(), ".test-chrome-profile");

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${CHROME_EXT}`,
      `--load-extension=${CHROME_EXT}`,
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  // Wait for the service worker to register and grab the extension ID
  let extensionId = "";
  for (let i = 0; i < 20; i++) {
    const targets = context.serviceWorkers();
    const sw = targets.find((t) => t.url().startsWith("chrome-extension://"));
    if (sw) {
      extensionId = new URL(sw.url()).hostname;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!extensionId) {
    // Fallback: try to parse extension ID from a background page
    const pages = context.backgroundPages();
    if (pages.length > 0) {
      extensionId = new URL(pages[0].url()).hostname;
    }
  }

  return {
    context,
    popupUrl: () => `chrome-extension://${extensionId}/popup.html`,
  };
}

/**
 * Launch a persistent Firefox context with the MV2 extension loaded.
 * Returns the context and a helper to derive the extension's popup URL.
 */
export async function firefoxContext(): Promise<{
  context: BrowserContext;
  popupUrl: () => Promise<string>;
}> {
  const userDataDir = path.join(process.cwd(), ".test-firefox-profile");

  const context = await firefox.launchPersistentContext(userDataDir, {
    headless: false,
    firefoxUserPrefs: {
      "extensions.autoDisableScopes": 0,
      "extensions.enabledScopes": 15,
    },
    args: ["-start-debugger-server", "6000"],
  });

  // Load the extension via the background page
  await context.addInitScript(() => {});

  return {
    context,
    popupUrl: async () => {
      // In Firefox, list all pages and find the moz-extension one
      for (let i = 0; i < 20; i++) {
        const pages = context.pages();
        const extPage = pages.find((p) => p.url().startsWith("moz-extension://"));
        if (extPage) {
          const origin = new URL(extPage.url()).origin;
          return `${origin}/popup.html`;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      return "";
    },
  };
}
