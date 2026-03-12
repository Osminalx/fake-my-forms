<script lang="ts">
  let { onClearAll }: { onClearAll: () => void } = $props();
</script>

<footer class="footer">
  <span class="footer-hint">shortcut: <span>Alt+Shift+F</span></span>
  <button type="button" class="clear-btn" onclick={onClearAll}>clear all</button>
</footer>

<style>
  .footer {
    padding: 10px 18px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--surface);
  }

  .footer-hint {
    font-size: 10px;
    color: var(--muted);
  }

  .footer-hint span {
    color: var(--text);
  }

  .clear-btn {
    font-size: 10px;
    color: var(--muted);
    background: none;
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 3px 8px;
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    transition: all .15s;
  }

  .clear-btn:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
</style>
