<script lang="ts">
  import type { TabDef, TabId } from "@/lib/types";
  import TabIcon from "@/lib/icons/TabIcon.svelte";

  let {
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs: TabDef[];
    activeTab: TabId;
    onTabChange: (id: TabId) => void;
  } = $props();
</script>

<nav class="bottom-nav">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="nav-tab"
      class:active={activeTab === tab.id}
      onclick={() => onTabChange(tab.id)}
      aria-current={activeTab === tab.id ? "true" : undefined}
    >
      <span class="nav-icon">
        <TabIcon tabId={tab.id} />
      </span>
      <span class="nav-label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-nav {
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    height: var(--nav-height);
    position: sticky;
    bottom: 0;
    z-index: var(--z-nav);
  }

  .nav-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 4px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--muted);
    transition: color 0.15s, background 0.15s;
    font-family: inherit;
    position: relative;
  }

  .nav-tab:hover {
    color: var(--text);
    background: var(--surface2);
  }

  .nav-tab.active {
    color: var(--accent);
  }

  .nav-tab.active::after {
    content: "";
    position: absolute;
    top: 0;
    left: 20%;
    right: 20%;
    height: 2px;
    background: var(--accent);
    border-radius: 0 0 2px 2px;
  }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
  }

  .nav-label {
    font-size: 9px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    font-weight: 600;
  }
</style>
