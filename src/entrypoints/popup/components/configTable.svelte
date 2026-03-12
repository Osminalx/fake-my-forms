<script lang="ts">
  import type { FieldDef } from "../../lib/fields";

  let {
    fields,
    customValues,
    onAddValue,
    onRemoveValue,
  }: {
    fields: FieldDef[];
    customValues: Record<string, string[]>;
    onAddValue: (type: string, value: string) => void;
    onRemoveValue: (type: string, index: number) => void;
  } = $props();

  const addInputs = $state<Record<string, string>>({});

  function submitAdd(type: string) {
    const val = (addInputs[type] ?? "").trim();
    if (!val) return;
    onAddValue(type, val);
    addInputs[type] = "";
  }
</script>

<div class="tab-config">
  <div class="table-header">
    <div>TYPE</div>
    <div>VALUE</div>
  </div>
  <div class="config-wrap">
    {#each fields as field (field.type)}
      {@const values = customValues[field.type] ?? []}
      <div class="field-row">
        <div class="field-type">
          <span class="field-icon">{field.icon}</span>
          <span class="field-name">{field.label}</span>
        </div>
        <div>
          <div class="field-values">
            {#if values.length > 0}
              {#each values as value, i (i)}
                <div class="value-chip">
                  <span class="value-chip-text" title={value}>{value}</span>
                  <button
                    type="button"
                    class="value-chip-rm"
                    onclick={() => onRemoveValue(field.type, i)}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              {/each}
            {:else}
              <span class="faker-badge">auto (faker)</span>
            {/if}
          </div>
          <div class="add-value-row">
            <input
              class="add-input"
              placeholder="add custom value…"
              value={addInputs[field.type] ?? ""}
              oninput={(e) => (addInputs[field.type] = e.currentTarget?.value ?? "")}
              onkeydown={(e) => e.key === "Enter" && submitAdd(field.type)}
            />
            <button
              type="button"
              class="add-btn"
              onclick={() => submitAdd(field.type)}
              aria-label="Add value"
            >
              +
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .tab-config {
    display: block;
  }

  .table-header {
    display: grid;
    grid-template-columns: 110px 1fr;
    padding: 6px 18px;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .config-wrap {
    max-height: 260px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .field-row {
    display: grid;
    grid-template-columns: 110px 1fr;
    align-items: start;
    padding: 10px 18px;
    border-bottom: 1px solid #ffffff06;
    gap: 10px;
    transition: background 0.1s;
  }

  .field-row:hover {
    background: var(--surface2);
  }

  .field-type {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 2px;
  }

  .field-icon {
    font-size: 13px;
  }

  .field-name {
    font-size: 11px;
    color: var(--text);
  }

  .field-values {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  .value-chip {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: 120px;
  }

  .value-chip-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 90px;
  }

  .value-chip-rm {
    color: var(--muted);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
  }

  .value-chip-rm:hover {
    color: var(--danger);
  }

  .faker-badge {
    font-size: 10px;
    color: var(--muted);
    font-style: italic;
  }

  .add-value-row {
    display: flex;
    gap: 4px;
    width: 100%;
    margin-top: 6px;
  }

  .add-input {
    flex: 1;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 3px 6px;
    outline: none;
    min-width: 0;
    transition: border-color 0.15s;
  }

  .add-input:focus {
    border-color: var(--accent2);
  }

  .add-input::placeholder {
    color: var(--muted);
  }

  .add-btn {
    background: var(--accent2);
    border: none;
    border-radius: 4px;
    color: #fff;
    font-size: 13px;
    width: 22px;
    height: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .add-btn:hover {
    opacity: 0.85;
  }
</style>
