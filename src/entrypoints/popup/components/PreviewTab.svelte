<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "wxt/browser";
  import { FIELDS } from "../../../lib/fields";
  import type { CustomValueWeight, FakerConfig } from "@/lib/fakerEngine";
  import type { PreviewEntry } from "../../../lib/types";

  let {
    locale,
    customValues,
  }: {
    locale: string;
    customValues: Record<string, CustomValueWeight[]>;
  } = $props();

  type PreviewState = "loading" | "loaded" | "empty" | "error";
  let state = $state<PreviewState>("loading");
  let entries = $state<PreviewEntry[]>([]);
  let errorMessage = $state("");

  function buildConfig(): FakerConfig {
    return Object.fromEntries(
      FIELDS.map((f) => [
        f.type,
        {
          enabled: true,
          probability: 100,
          customValues: Array.isArray(customValues[f.type])
            ? customValues[f.type].map((v) => ({
                value: v.value,
                weight: v.weight,
              }))
            : [],
        },
      ]),
    );
  }

  // Group entries by fieldType, preserving first-appearance order
  function groupByType(entries: PreviewEntry[]): { type: string; items: PreviewEntry[] }[] {
    const seen = new Set<string>();
    const groups: { type: string; items: PreviewEntry[] }[] = [];
    for (const entry of entries) {
      if (!seen.has(entry.fieldType)) {
        seen.add(entry.fieldType);
        groups.push({ type: entry.fieldType, items: [] });
      }
      const group = groups.find((g) => g.type === entry.fieldType)!;
      group.items.push(entry);
    }
    return groups;
  }

  onMount(async () => {
    state = "loading";
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        state = "error";
        errorMessage = "Could not find active tab.";
        return;
      }

      const config = buildConfig();
      const response: unknown = await browser.tabs.sendMessage(tab.id, {
        type: "PREVIEW_FILL",
        config,
        locale,
      });

      if (
        response &&
        typeof response === "object" &&
        "entries" in response &&
        Array.isArray((response as { entries: unknown }).entries)
      ) {
        const result = response as { entries: PreviewEntry[] };
        if (result.entries.length === 0) {
          state = "empty";
        } else {
          entries = result.entries;
          state = "loaded";
        }
      } else {
        state = "error";
        errorMessage = "Unexpected response from page.";
      }
    } catch (err) {
      console.warn("[fake-my-forms] Preview unavailable:", err);
      state = "error";
      errorMessage = "Preview unavailable — cannot access this page.";
    }
  });
</script>

<div class="preview-tab">
  {#if state === "loading"}
    <div class="preview-status">
      <div class="spinner"></div>
      <p class="status-text">Loading fields...</p>
    </div>
  {:else if state === "error"}
    <div class="preview-status">
      <div class="status-icon">⚠️</div>
      <p class="status-text">{errorMessage}</p>
      <p class="status-hint">Try refreshing the page and try again.</p>
    </div>
  {:else if state === "empty"}
    <div class="preview-status">
      <div class="status-icon">🔍</div>
      <p class="status-text">No fillable inputs detected on this page.</p>
    </div>
  {:else if state === "loaded"}
    <div class="preview-header">
      <span class="preview-count">{entries.length} fillable fields</span>
    </div>

    <div class="preview-groups">
      {#each groupByType(entries) as group}
        <div class="field-group">
          <div class="group-header">
            <span class="group-type-badge">{group.type}</span>
            <span class="group-count">{group.items.length}</span>
          </div>
          {#each group.items as entry}
            <div class="entry-row">
              <div class="entry-info">
                <span class="entry-label">{entry.label || entry.fieldType}</span>
                <span class="entry-tag">{entry.fieldType}</span>
                {#if entry.isFrameworkDropdown}
                  <span class="entry-badge framework">⚡ combobox</span>
                {/if}
                {#if entry.groupType !== "single"}
                  <span class="entry-badge confirm">
                    {entry.groupType === "confirm-primary" ? "primary" : "confirm"}
                  </span>
                {/if}
              </div>
              <div class="entry-value">{entry.value ?? "(no value)"}</div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .preview-tab {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 200px;
  }

  .preview-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 16px;
    text-align: center;
    flex: 1;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border);
    border-top: 2px solid var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .status-icon {
    font-size: 28px;
    opacity: 0.6;
  }

  .status-text {
    font-size: 13px;
    color: var(--text);
    margin: 0;
    line-height: 1.4;
  }

  .status-hint {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
  }

  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
  }

  .preview-count {
    font-family: "Syne", sans-serif;
    font-weight: 700;
    font-size: 12px;
    color: var(--text);
  }

  .preview-groups {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
  }

  .group-type-badge {
    font-family: "Syne", sans-serif;
    font-weight: 700;
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .group-count {
    font-size: 10px;
    color: var(--muted);
    background: var(--surface2);
    padding: 1px 6px;
    border-radius: var(--radius-full);
  }

  .entry-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .entry-info {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .entry-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text);
  }

  .entry-tag {
    font-size: 9px;
    color: var(--muted);
    background: var(--surface2);
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    text-transform: lowercase;
  }

  .entry-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: var(--radius-sm);
  }

  .entry-badge.framework {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .entry-badge.confirm {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .entry-value {
    font-size: 12px;
    color: var(--muted);
    font-family: "SF Mono", "Fira Code", monospace;
    word-break: break-all;
    line-height: 1.3;
  }
</style>
