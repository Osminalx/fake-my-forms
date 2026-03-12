import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";

afterEach(cleanup);
import Tabs from "../../src/entrypoints/popup/components/tabs.svelte";

describe("Tabs component", () => {
  it("renders both tab buttons", () => {
    render(Tabs, { props: { activeTab: "config", onTabChange: () => {} } });

    expect(screen.getByRole("button", { name: "Custom Values" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About" })).toBeInTheDocument();
  });

  it("marks the active tab with the active class", () => {
    render(Tabs, { props: { activeTab: "config", onTabChange: () => {} } });

    const configBtn = screen.getByRole("button", { name: "Custom Values" });
    const aboutBtn = screen.getByRole("button", { name: "About" });

    expect(configBtn.classList.contains("active")).toBe(true);
    expect(aboutBtn.classList.contains("active")).toBe(false);
  });

  it("marks the about tab as active when activeTab='about'", () => {
    render(Tabs, { props: { activeTab: "about", onTabChange: () => {} } });

    const configBtn = screen.getByRole("button", { name: "Custom Values" });
    const aboutBtn = screen.getByRole("button", { name: "About" });

    expect(aboutBtn.classList.contains("active")).toBe(true);
    expect(configBtn.classList.contains("active")).toBe(false);
  });

  it("calls onTabChange with 'about' when clicking the About tab", async () => {
    const onTabChange = mock((_tab: string) => {});
    render(Tabs, { props: { activeTab: "config", onTabChange } });

    await fireEvent.click(screen.getByRole("button", { name: "About" }));

    expect(onTabChange).toHaveBeenCalledWith("about");
  });

  it("calls onTabChange with 'config' when clicking the Custom Values tab", async () => {
    const onTabChange = mock((_tab: string) => {});
    render(Tabs, { props: { activeTab: "about", onTabChange } });

    await fireEvent.click(screen.getByRole("button", { name: "Custom Values" }));

    expect(onTabChange).toHaveBeenCalledWith("config");
  });

  it("calls onTabChange exactly once per click", async () => {
    const onTabChange = mock((_tab: string) => {});
    render(Tabs, { props: { activeTab: "config", onTabChange } });

    await fireEvent.click(screen.getByRole("button", { name: "About" }));
    await fireEvent.click(screen.getByRole("button", { name: "About" }));

    expect(onTabChange).toHaveBeenCalledTimes(2);
  });
});
