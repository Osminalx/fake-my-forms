<script lang="ts">
  import { onMount } from "svelte";

  let {
    show,
    onClose,
  }: {
    show: boolean;
    onClose: () => void;
  } = $props();

  let modalRef: HTMLDivElement | undefined = $state();
  let overlayRef: HTMLDivElement | undefined = $state();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && show) {
      onClose();
    }
  }

  function handleOverlayKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClose();
    }
  }

  function handleContentKeydown(e: KeyboardEvent) {
    // Only stop propagation for Escape to prevent double-close
    if (e.key === "Escape") {
      e.stopPropagation();
    }
  }

  $effect(() => {
    if (show) {
      document.addEventListener("keydown", handleKeydown);
      // Focus trap: focus the close button
      requestAnimationFrame(() => {
        modalRef?.querySelector<HTMLButtonElement>(".close-btn")?.focus();
      });
    } else {
      document.removeEventListener("keydown", handleKeydown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

{#if show}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    data-testid="modal-backdrop"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    bind:this={overlayRef}
    onclick={onClose}
    onkeydown={handleOverlayKeydown}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="modal-content"
      bind:this={modalRef}
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleContentKeydown}
    >
      <button
        type="button"
        class="close-btn"
        onclick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
      <div class="modal-body">
        <div class="modal-icon">⚡</div>
        <h2 class="modal-title">FakeIt v0.1.0</h2>
        <p class="modal-desc">
          Click the icon or press <kbd class="kbd">Alt+Shift+F</kbd> to fill all
          inputs with fake data.
        </p>
        <p class="modal-desc">
          Custom values override faker defaults. Empty = auto-generated.
        </p>
        <div class="modal-tech">
          Built with <strong>WXT</strong> + <strong>Svelte</strong> + <strong>faker-js</strong>
        </div>
        <div class="modal-links">
          <a
            href="https://github.com/osmin/fake-my-forms"
            target="_blank"
            rel="noopener noreferrer"
            class="modal-link"
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: absolute;
    inset: 0;
    background: #00000088;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    border-radius: 16px;
  }

  .modal-content {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 320px;
    max-width: 90%;
    position: relative;
    box-shadow: var(--shadow-lg);
  }

  .close-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 24px;
    height: 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    background: var(--surface2);
    color: var(--muted);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: inherit;
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text);
    border-color: var(--muted);
  }

  .modal-body {
    padding: 28px 22px 22px;
    text-align: center;
  }

  .modal-icon {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    margin: 0 auto 12px;
    box-shadow: 0 0 20px #00e5a055;
  }

  .modal-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 16px;
    color: var(--text);
    margin: 0 0 10px;
  }

  .modal-desc {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.7;
    margin: 0 0 6px;
  }

  .kbd {
    font-size: 10px;
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: 1px 5px;
    font-family: "JetBrains Mono", monospace;
    background: var(--accent-dim);
  }

  .modal-tech {
    margin-top: 14px;
    font-size: 10px;
    color: var(--accent2);
    line-height: 1.6;
  }

  .modal-links {
    margin-top: 14px;
  }

  .modal-link {
    font-size: 10px;
    color: var(--accent);
    text-decoration: none;
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: 5px 12px;
    display: inline-block;
    transition: all 0.15s;
  }

  .modal-link:hover {
    background: var(--accent-dim);
  }
</style>
