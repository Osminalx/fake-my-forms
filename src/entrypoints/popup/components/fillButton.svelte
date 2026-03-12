<script lang="ts">
  let { onFill }: { onFill: () => void } = $props();

  let filling = $state(false);

  function handleClick() {
    onFill();
    filling = true;
    setTimeout(() => {
      filling = false;
    }, 1200);
  }
</script>

<button
  type="button"
  class="fill-btn"
  class:filling
  onclick={handleClick}
  disabled={filling}
>
  {#if filling}
    ✓ Filled!
  {:else}
    <span class="fill-btn-icon">⚡</span>
    Fill All Inputs
  {/if}
</button>

<style>
  .fill-btn {
    width: 100%;
    padding: 12px;
    background: var(--accent);
    color: #000;
    border: none;
    border-radius: 10px;
    font-family: "Syne", sans-serif;
    font-weight: 800;
    font-size: 14px;
    letter-spacing: 0.5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s;
    box-shadow: 0 4px 20px #00e5a033;
    position: relative;
    overflow: hidden;
  }

  .fill-btn:disabled {
    cursor: default;
  }

  .fill-btn::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #ffffff22 0%, transparent 60%);
  }

  .fill-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 28px #00e5a055;
  }

  .fill-btn:active:not(:disabled) {
    transform: translateY(0);
  }

  .fill-btn-icon {
    font-size: 16px;
  }

  .fill-btn.filling {
    animation: flash 0.4s ease;
  }

  @keyframes flash {
    0% {
      background: var(--accent);
    }
    50% {
      background: #fff;
    }
    100% {
      background: var(--accent);
    }
  }
</style>
