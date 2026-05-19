<script lang="ts">
  let {
    title,
    icon,
    collapsed,
    onToggle,
    children,
  }: {
    title: string;
    icon: string;
    collapsed: boolean;
    onToggle: () => void;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<div class="collapsible-section">
  <button
    type="button"
    class="section-header"
    class:collapsed
    onclick={onToggle}
    aria-expanded={!collapsed}
  >
    <span class="section-icon">{icon}</span>
    <span class="section-title">{title}</span>
    <span class="chevron" class:collapsed>▾</span>
  </button>
  {#if !collapsed}
    <div class="section-content">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>

<style>
  .collapsible-section {
    border-bottom: 1px solid #ffffff06;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 18px;
    border: none;
    background: var(--surface);
    cursor: pointer;
    font-family: inherit;
    color: var(--text);
    transition: background 0.1s;
    text-align: left;
  }

  .section-header:hover {
    background: var(--surface2);
  }

  .section-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .section-title {
    flex: 1;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--muted);
  }

  .chevron {
    font-size: 9px;
    color: var(--muted);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .section-content {
    background: var(--bg);
  }
</style>
