<header class="mainHeader">
  <div class="logo">⚡</div>
  <div class="header-text">
    <h1 class="header-title">FakeIt</h1>
    <h3 class="header-sub">form autofill & faker</h3>
  </div>
  <span class="kbd">Alt+Shift+F</span>
</header>

<style>
  .mainHeader {
    padding: 16px 18px 14px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo {
    width: 30px;
    height: 30px;
    background: var(--accent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    flex-shrink: 0;
    box-shadow: 0 0 16px #00e5a055;
  }

  .header-text {
    flex: 1;
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 15px;
    color: var(--text);
    letter-spacing: -0.3px;
    margin: 0;
  }

  .header-sub {
    font-size: 10px;
    color: var(--muted);
    margin-top: 1px;
    letter-spacing: 0.5px;
    font-weight: 400;
  }

  .kbd {
    font-size: 9px;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 5px;
    letter-spacing: 0.3px;
    background: var(--surface2);
  }
</style>
