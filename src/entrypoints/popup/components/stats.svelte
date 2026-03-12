<script lang="ts">
  let { count = 0 }: { count?: number } = $props();
</script>

<div class="stats">
  <div class="stats-dot"></div>
  <div class="stats-text">inputs detected on page</div>
  <div class="stats-count"><span>{count}</span> fields</div>
</div>

<style>
  .stats {
    padding: 10px 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--accent-dim);
    border-bottom: 1px solid #00e5a018;
  }

  .stats-dot {
    width: 6px;
    height: 6px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .stats-text {
    font-size: 11px;
    color: var(--accent);
    flex: 1;
  }

  .stats-count {
    font-size: 11px;
    color: var(--muted);
  }

  .stats-count span {
    color: var(--text);
    font-weight: 600;
  }
</style>
