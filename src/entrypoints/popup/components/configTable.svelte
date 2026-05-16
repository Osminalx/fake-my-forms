<script lang="ts">
  import type { FieldDef } from "../../lib/fields";
  import type { CustomValueWeight } from "../../lib/fakerEngine";

  let {
    fields,
    customValues,
    onAddValue,
    onRemoveValue,
    onUpdateWeight,
  }: {
    fields: FieldDef[];
    customValues: Record<string, CustomValueWeight[]>;
    onAddValue: (type: string, value: string) => void;
    onRemoveValue: (type: string, index: number) => void;
    onUpdateWeight: (type: string, index: number, weight: number) => void;
  } = $props();

  const addInputs = $state<Record<string, string>>({});
  const pendingWeights = $state<Record<string, string>>({});

  function submitAdd(type: string) {
    const val = (addInputs[type] ?? "").trim();
    if (!val) return;
    onAddValue(type, val);
    addInputs[type] = "";
  }

  function weightKey(type: string, index: number): string {
    return `${type}::${index}`;
  }

  function onWeightInput(type: string, index: number, value: string) {
    pendingWeights[weightKey(type, index)] = value;
  }

  function onWeightBlur(type: string, index: number, currentWeight: number) {
    const key = weightKey(type, index);
    const raw = pendingWeights[key];
    if (raw === undefined) return;
    const parsed = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? 100 : Math.max(0, Math.min(100, parsed));
    // Only call if the raw input differs from the current weight
    if (raw !== String(currentWeight)) {
      onUpdateWeight(type, index, clamped);
    }
    delete pendingWeights[key];
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
                  <span class="value-chip-text" title={value.value}>{value.value}</span>
                  <input
                    type="number"
                    class="weight-input"
                    min="0"
                    max="100"
                    value={pendingWeights[weightKey(field.type, i)] ?? value.weight}
                    oninput={(e) =>
                      onWeightInput(field.type, i, e.currentTarget?.value ?? "")}
                    onblur={() => onWeightBlur(field.type, i, value.weight)}
                    aria-label="Weight"
                  />
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

  .weight-input {
    width: 40px;
    font-size: 10px;
    font-family: "JetBrains Mono", monospace;
    text-align: center;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 3px;
    color: var(--text);
    padding: 1px 2px;
    outline: none;
    transition: border-color 0.15s;
    -moz-appearance: textfield;
  }

  .weight-input::-webkit-inner-spin-button,
  .weight-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .weight-input:focus {
    border-color: var(--accent2);
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
