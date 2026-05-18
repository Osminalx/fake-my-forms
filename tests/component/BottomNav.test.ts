import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";

afterEach(cleanup);

import BottomNav from "../../src/entrypoints/popup/components/bottomNav.svelte";
import type { TabDef, TabId } from "../../src/lib/types";

const testTabs: TabDef[] = [
  { id: "config", icon: "📋", label: "Config" },
  { id: "preview", icon: "👁", label: "Preview" },
  { id: "per-fill", icon: "✏️", label: "Per-Fill" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

describe("BottomNav component", () => {
  it("renders all tab buttons from TabDef[]", () => {
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange: () => {} },
    });

    expect(screen.getByRole("button", { name: /Config/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Per-Fill/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Settings/i })).toBeInTheDocument();
  });

  it("marks the active tab with 'active' class", () => {
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange: () => {} },
    });

    const configBtn = screen.getByRole("button", { name: /Config/i });
    const settingsBtn = screen.getByRole("button", { name: /Settings/i });

    expect(configBtn.classList.contains("active")).toBe(true);
    expect(settingsBtn.classList.contains("active")).toBe(false);
  });

  it("marks settings as active when activeTab='settings'", () => {
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "settings", onTabChange: () => {} },
    });

    const configBtn = screen.getByRole("button", { name: /Config/i });
    const settingsBtn = screen.getByRole("button", { name: /Settings/i });

    expect(settingsBtn.classList.contains("active")).toBe(true);
    expect(configBtn.classList.contains("active")).toBe(false);
  });

  it("calls onTabChange with the clicked tab id", async () => {
    const onTabChange = mock((_id: TabId) => {});
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange },
    });

    await fireEvent.click(screen.getByRole("button", { name: /Settings/i }));

    expect(onTabChange).toHaveBeenCalledWith("settings");
  });

  it("calls onTabChange with 'preview' when clicking the Preview tab", async () => {
    const onTabChange = mock((_id: TabId) => {});
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange },
    });

    await fireEvent.click(screen.getByRole("button", { name: /Preview/i }));

    expect(onTabChange).toHaveBeenCalledWith("preview");
  });

  it("calls onTabChange exactly once per click", async () => {
    const onTabChange = mock((_id: TabId) => {});
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange },
    });

    await fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    await fireEvent.click(screen.getByRole("button", { name: /Settings/i }));

    expect(onTabChange).toHaveBeenCalledTimes(2);
  });

  it("renders icons for each tab", () => {
    render(BottomNav, {
      props: { tabs: testTabs, activeTab: "config", onTabChange: () => {} },
    });

    // Each tab button should contain an icon element
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      const icon = btn.querySelector(".nav-icon");
      expect(icon).toBeInTheDocument();
    }
  });
});
