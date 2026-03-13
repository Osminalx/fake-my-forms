import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    permissions: ['storage'],
    browser_specific_settings: {
      gecko: {
        id: 'fake-my-forms@extension.local',
      },
    },
  },
});
