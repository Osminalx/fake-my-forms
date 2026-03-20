<script lang="ts">
  import { LOCALE_COUNTRY_MAP } from "@/lib/fakerEngine";

  let { locale = $bindable("es") } = $props();

  // ISO 3166-1 alpha-2 → flag emoji
  const LOCALE_FLAGS: Record<string, string> = {
    en_US: "\u{1F1FA}\u{1F1F8}",
    en_AU: "\u{1F1E6}\u{1F1FA}",
    en_CA: "\u{1F1E8}\u{1F1E6}",
    en_GB: "\u{1F1EC}\u{1F1E7}",
    de: "\u{1F1E9}\u{1F1EA}",
    fr: "\u{1F1EB}\u{1F1F7}",
    es: "\u{1F1EA}\u{1F1F8}",
    pt_BR: "\u{1F1E7}\u{1F1F7}",
    ja: "\u{1F1EF}\u{1F1F5}",
    it: "\u{1F1EE}\u{1F1F9}",
    pt_PT: "\u{1F1F5}\u{1F1F9}",
    nl: "\u{1F1F3}\u{1F1F1}",
    pl: "\u{1F1F5}\u{1F1F1}",
    ar: "\u{1F1F8}\u{1F1E6}",
    zh_CN: "\u{1F1E8}\u{1F1F3}",
    ko: "\u{1F1F0}\u{1F1F7}",
    ru: "\u{1F1F7}\u{1F1FA}",
    tr: "\u{1F1F9}\u{1F1F7}",
    sv: "\u{1F1F8}\u{1F1EA}",
    nb_NO: "\u{1F1F3}\u{1F1F4}",
    da: "\u{1F1E9}\u{1F1F0}",
    fi: "\u{1F1EB}\u{1F1EE}",
    ro: "\u{1F1F7}\u{1F1F4}",
    hu: "\u{1F1ED}\u{1F1FA}",
    uk: "\u{1F1FA}\u{1F1E6}",
    sk: "\u{1F1F8}\u{1F1F0}",
  };

  const locales = Object.entries(LOCALE_COUNTRY_MAP).map(([key, country]) => ({
    key,
    country,
    flag: LOCALE_FLAGS[key] ?? "\u{1F3F3}\u{FE0F}",
  }));
</script>

<div class="locale-row">
  <span class="locale-label">faker locale</span>
  <select
    name="locale-selector"
    id="localeSelect"
    class="locale-select"
    value={locale}
    onchange={(e) => (locale = e.currentTarget?.value ?? "es")}
  >
    {#each locales as { key, country, flag }}
      <option value={key}>{flag} {key} — {country}</option>
    {/each}
  </select>
</div>

<style>
  .locale-row {
    padding: 10px 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--border);
  }

  .locale-label {
    font-size: 11px;
    color: var(--muted);
    flex: 1;
  }

  .locale-select {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 6px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    max-width: 240px;
  }

  .locale-select:focus {
    border-color: var(--accent);
  }
</style>
