<script lang="ts">
  let { inputCount = 0, onAboutClick }: {
    inputCount?: number;
    onAboutClick?: () => void;
  } = $props();
</script>

<header class="mainHeader">
  <div class="logo">⚡</div>
  <div class="header-text">
    <h1 class="header-title">FakeIt</h1>
    <h3 class="header-sub">form autofill & faker</h3>
  </div>
  <div class="header-actions">
    {#if inputCount > 0}
      <div class="stats-badge" title="inputs detected on page">
        <span class="stats-dot"></span>
        <span class="stats-count">{inputCount}</span>
      </div>
    {/if}
    <button
      type="button"
      class="info-btn"
      onclick={onAboutClick}
      aria-label="About FakeIt"
    >
      ?
    </button>
  </div>
</header>

<style>
  .mainHeader {
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
    height: var(--header-height);
  }

  .logo {
    width: 28px;
    height: 28px;
    background: var(--accent);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
    box-shadow: 0 0 16px #00e5a055;
  }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 14px;
    color: var(--text);
    letter-spacing: -0.3px;
    margin: 0;
    line-height: 1.2;
  }

  .header-sub {
    font-size: 9px;
    color: var(--muted);
    margin-top: 1px;
    letter-spacing: 0.5px;
    font-weight: 400;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .stats-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--accent-dim);
    border: 1px solid #00e5a030;
    border-radius: var(--radius-full);
    padding: 2px 8px 2px 6px;
  }

  .stats-dot {
    width: 5px;
    height: 5px;
    background: var(--accent);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .stats-count {
    font-size: 10px;
    font-weight: 700;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .info-btn {
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    background: var(--surface2);
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    line-height: 1;
  }

  .info-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
    background: var(--accent-dim);
  }
</style>
