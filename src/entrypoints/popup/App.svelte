<script lang="ts">
  import { onMount } from "svelte";
  import { FIELDS } from "../../lib/fields";
  import { browser } from "wxt/browser";
  import { type FakerConfig } from "@/lib/fakerEngine";
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
  let inputCount = $state(0);

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
     // Create a plain config object to avoid sending proxies which cause cloning errors
     const config: FakerConfig = Object.fromEntries(
       FIELDS.map((f) => [
         f.type,
         {
           enabled: true,
           probability: 100,
           // Ensure customValues is a plain array, not a proxy
           customValues: Array.isArray(customValues[f.type]) ? [...customValues[f.type]] : [],
         },
       ]),
     );
     console.log("config: ", config);
     const [tab] = await browser.tabs.query({
       active: true,
       currentWindow: true,
     });
     if (tab?.id != null) {
        await browser.tabs.sendMessage(tab.id, { type: "FILL_FORM", config, locale });
     }
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
