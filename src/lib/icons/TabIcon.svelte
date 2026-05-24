<script lang="ts">
  import type { TabId } from "$lib/types";

  let {
    tabId,
    size = 16,
  }: { tabId: TabId; size?: number } = $props();
</script>

{#if tabId === "config"}
  <!-- Config: sliders/controls -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <line x1="2" y1="5" x2="11" y2="5" />
    <circle cx="14" cy="5" r="2" />
    <line x1="2" y1="10" x2="9" y2="10" />
    <circle cx="12" cy="10" r="2" />
    <line x1="2" y1="15" x2="7" y2="15" />
    <circle cx="10" cy="15" r="2" />
  </svg>
{:else if tabId === "preview"}
  <!-- Preview: eye -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M2 10 C2 10, 5 4, 10 4 C15 4, 18 10, 18 10 C18 10, 15 16, 10 16 C5 16, 2 10, 2 10 Z" />
    <circle cx="10" cy="10" r="2.5" />
  </svg>
{:else if tabId === "per-fill"}
  <!-- Per-Fill: pencil/edit -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M13.5 2.5 L17.5 6.5 L7 17 L2 18 L3 13 Z" />
    <line x1="11.5" y1="4.5" x2="15.5" y2="8.5" />
  </svg>
{:else if tabId === "settings"}
  <!-- Settings: gear -->
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="10" cy="10" r="3.5" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="10" y1="16" x2="10" y2="19" />
    <line x1="1" y1="10" x2="4" y2="10" />
    <line x1="16" y1="10" x2="19" y2="10" />
  </svg>
{/if}
