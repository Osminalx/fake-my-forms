<script lang="ts">
  let { locale = $bindable("es") } = $props();
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
    <option value="en">🇺🇸 en</option>
    <option value="es">🇪🇸 es</option>
    <option value="de">🇩🇪 de</option>
    <option value="fr">🇫🇷 fr</option>
    <option value="pt_BR">🇧🇷 pt_BR</option>
    <option value="ja">🇯🇵 ja</option>
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
  }

  .locale-select:focus {
    border-color: var(--accent);
  }
</style>
