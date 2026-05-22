<script lang="ts">
  import { onMount } from "svelte";
  import { FIELDS } from "../../lib/fields";
  import { browser } from "wxt/browser";
  import { type CustomValueWeight, type FakerConfig } from "@/lib/fakerEngine";
  import type { TabId, FieldGroup } from "../../lib/types";
  import type { TabDef } from "../../lib/types";
  import Header from "./components/header.svelte";
  import FillButton from "./components/fillButton.svelte";
  import PreviewTab from "./components/PreviewTab.svelte";
  import ConfigTable from "./components/configTable.svelte";
  import SettingsMenu from "./components/settingsMenu.svelte";
  import AboutModal from "./components/aboutModal.svelte";
  import BottomNav from "./components/bottomNav.svelte";
  import Footer from "./components/footer.svelte";

  const TABS: TabDef[] = [
    { id: "config", icon: "📋", label: "Config" },
    { id: "preview", icon: "👁", label: "Preview" },
    { id: "per-fill", icon: "✏️", label: "Per-Fill" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const customValues = $state<Record<string, CustomValueWeight[]>>(
    Object.fromEntries(FIELDS.map((f) => [f.type, []])),
  );
  let activeTab = $state<TabId>("config");
  let locale = $state("es");
  let inputCount = $state(0);
  let showAbout = $state(false);

  // Cached preview values so Fill uses the SAME values the user saw in Preview tab
  let previewValues = $state<Record<string, string> | null>(null);

  function onPreviewReady(values: Record<string, string>) {
    previewValues = values;
  }

  const collapsedGroups = $state<Record<FieldGroup, boolean>>({
    personal: false,
    contact: false,
    location: false,
    account: false,
  });

  function onAddValue(type: string, value: string) {
    if (!value.trim()) return;
    customValues[type] = [
      ...(customValues[type] ?? []),
      { value: value.trim(), weight: 100 },
    ];
  }

  function onRemoveValue(type: string, index: number) {
    const next = [...(customValues[type] ?? [])];
    next.splice(index, 1);
    customValues[type] = next;
  }

  function onUpdateWeight(type: string, index: number, weight: number) {
    const arr = [...(customValues[type] ?? [])];
    arr[index] = { ...arr[index], weight };
    customValues[type] = arr;
  }

  function onClearAll() {
    FIELDS.forEach((f) => {
      customValues[f.type] = [];
    });
  }

  function onTabChange(tab: TabId) {
    activeTab = tab;
  }

  function onToggleGroup(group: FieldGroup) {
    collapsedGroups[group] = !collapsedGroups[group];
  }

  onMount(async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      const response = await browser.tabs.sendMessage(tab.id, {
        type: "GET_INPUT_STATS",
      });

      if (response && typeof response.count === "number") {
        inputCount = response.count;
      }
    } catch (error) {
      console.warn("[fake-my-forms] Failed to get input stats:", error);
    }
  });

  async function onFill() {
    try {
      const config: FakerConfig = Object.fromEntries(
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
      console.log("config: ", config);
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id != null) {
        await browser.tabs.sendMessage(tab.id, {
          type: "FILL_FORM",
          config,
          locale,
          values: previewValues ?? undefined,
        });
      }
    } catch (err) {
      console.error("[fake-my-forms] Fill failed:", err);
    } finally {
      // Always clear cached values — even on error, so the user can retry
      previewValues = null;
    }
  }
</script>

<div class="popup">
  <Header {inputCount} onAboutClick={() => (showAbout = true)} />

  <div class="main-content">
    {#if activeTab === "config"}
      <ConfigTable
        fields={FIELDS}
        {customValues}
        {collapsedGroups}
        {onToggleGroup}
        {onAddValue}
        {onRemoveValue}
        {onUpdateWeight}
      />
    {:else if activeTab === "preview"}
      <PreviewTab {locale} {customValues} {onPreviewReady} />
    {:else if activeTab === "per-fill"}
      <div class="placeholder-view">
        <div class="placeholder-icon">✏️</div>
        <p class="placeholder-title">Per-Fill</p>
        <p class="placeholder-desc">Configure field-by-field fill behavior. Coming soon!</p>
      </div>
    {:else if activeTab === "settings"}
      <SettingsMenu bind:locale onAboutClick={() => (showAbout = true)} />
    {/if}
  </div>

  <div class="sticky-fill-wrap">
    <FillButton {onFill} />
  </div>

  <BottomNav tabs={TABS} {activeTab} {onTabChange} />

  <Footer {onClearAll} />

  <AboutModal show={showAbout} onClose={() => (showAbout = false)} />
</div>

<style>
  .popup {
    width: 380px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 24px 80px #00000080,
      0 0 0 1px #ffffff08;
    position: relative;
    display: flex;
    flex-direction: column;
    max-height: 600px;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .sticky-fill-wrap {
    position: sticky;
    bottom: var(--nav-height);
    z-index: var(--z-sticky);
    background: var(--bg);
    border-top: 1px solid var(--border);
  }

  .placeholder-view {
    padding: 40px 18px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .placeholder-icon {
    font-size: 32px;
    opacity: 0.4;
    margin-bottom: 4px;
  }

  .placeholder-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 15px;
    color: var(--text);
    margin: 0;
  }

  .placeholder-desc {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
    margin: 0;
    max-width: 240px;
  }
</style>
