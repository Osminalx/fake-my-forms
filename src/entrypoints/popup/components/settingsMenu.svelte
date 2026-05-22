<script lang="ts">
  import { LOCALE_COUNTRY_MAP } from "@/lib/fakerEngine";

  let {
    locale = $bindable("es"),
    onAboutClick,
  }: {
    locale?: string;
    onAboutClick?: () => void;
  } = $props();

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

<div class="settings-view">
  <section class="settings-section">
    <h2 class="section-heading">Locale</h2>
    <div class="locale-row">
      <span class="locale-label">faker locale</span>
      <select
        name="locale-selector"
        class="locale-select"
        value={locale}
        onchange={(e) => (locale = e.currentTarget?.value ?? "es")}
      >
        {#each locales as { key, country, flag }}
          <option value={key}>{flag} {key} — {country}</option>
        {/each}
      </select>
    </div>
  </section>

  <section class="settings-section">
    <h2 class="section-heading">About</h2>
    <p class="about-summary">
      Fake my Forms v0.1.0 — automatically fills form inputs with realistic fake
      data.
    </p>
    <button type="button" class="about-btn" onclick={onAboutClick}>
      View details →
    </button>
  </section>
</div>

<style>
  .settings-view {
    padding-bottom: 8px;
  }

  .settings-section {
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--border);
  }

  .section-heading {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 0 0 10px;
  }

  .locale-row {
    display: flex;
    align-items: center;
    gap: 8px;
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
    font-size: 10px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    max-width: 220px;
  }

  .locale-select:focus {
    border-color: var(--accent);
  }

  .about-summary {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
    margin: 0 0 8px;
  }

  .about-btn {
    font-size: 10px;
    color: var(--accent);
    background: none;
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: 5px 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }

  .about-btn:hover {
    background: var(--accent-dim);
    color: var(--accent);
  }
</style>
