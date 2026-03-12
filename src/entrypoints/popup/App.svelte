<script lang="ts">
  import { FIELDS } from "../../lib/fields";
  import Header from "./components/header.svelte";
  import Stats from "./components/stats.svelte";
  import Locale from "./components/locale.svelte";
  import FillButton from "./components/fillButton.svelte";
  import Tabs from "./components/tabs.svelte";
  import ConfigTable from "./components/configTable.svelte";
  import About from "./components/about.svelte";
  import Footer from "./components/footer.svelte";

  type TabId = "config" | "about";

  const customValues = $state<Record<string, string[]>>(
    Object.fromEntries(FIELDS.map((f) => [f.type, []])),
  );
  let activeTab = $state<TabId>("config");
  let locale = $state("es");
  let inputCount = $state(7);

  function onAddValue(type: string, value: string) {
    if (!value.trim()) return;
    customValues[type] = [...(customValues[type] ?? []), value.trim()];
  }

  function onRemoveValue(type: string, index: number) {
    const next = [...(customValues[type] ?? [])];
    next.splice(index, 1);
    customValues[type] = next;
  }

  function onClearAll() {
    FIELDS.forEach((f) => {
      customValues[f.type] = [];
    });
  }

  function onTabChange(tab: TabId) {
    activeTab = tab;
  }

  function onFill() {
    // Stub: later connect to content script / fakerEngine
  }
</script>

<div class="popup">
  <Header />
  <Stats count={inputCount} />
  <Locale bind:locale />
  <div class="fill-btn-wrap">
    <FillButton {onFill} />
  </div>
  <Tabs {activeTab} {onTabChange} />
  {#if activeTab === "config"}
    <ConfigTable fields={FIELDS} {customValues} {onAddValue} {onRemoveValue} />
  {:else}
    <About />
  {/if}
  <Footer {onClearAll} />
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
  }

  .fill-btn-wrap {
    padding: 14px 18px 10px;
  }
</style>
