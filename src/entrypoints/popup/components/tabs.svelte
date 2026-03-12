<script lang="ts">
  type TabId = "config" | "about";

  let {
    activeTab,
    onTabChange,
  }: {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
  } = $props();
</script>

<div class="tabs">
  <button
    type="button"
    class="tab"
    class:active={activeTab === "config"}
    onclick={() => onTabChange("config")}
  >
    Custom Values
  </button>
  <button
    type="button"
    class="tab"
    class:active={activeTab === "about"}
    onclick={() => onTabChange("about")}
  >
    About
  </button>
</div>

<style>
  .tabs {
    display: flex;
    padding: 0 18px;
    gap: 2px;
    border-bottom: 1px solid var(--border);
  }

  .tab {
    font-size: 11px;
    color: var(--muted);
    padding: 8px 10px;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    font-family: "JetBrains Mono", monospace;
    letter-spacing: 0.3px;
  }

  .tab:hover {
    color: var(--text);
  }

  .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }
</style>
