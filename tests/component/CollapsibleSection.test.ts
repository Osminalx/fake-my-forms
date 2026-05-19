import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";

afterEach(cleanup);

import CollapsibleSection from "../../src/entrypoints/popup/components/collapsibleSection.svelte";

describe("CollapsibleSection component", () => {
  it("renders the title and icon", () => {
    render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle: () => {} },
    });

    expect(screen.getByText("Personal")).toBeInTheDocument();
    expect(screen.getByText("👤")).toBeInTheDocument();
  });

  it("renders the section header button with aria-expanded=true when expanded", () => {
    render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle: () => {} },
    });

    const header = screen.getByRole("button", { name: /Personal/i });
    expect(header).toBeInTheDocument();
    expect(header.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders the section header button with aria-expanded=false when collapsed", () => {
    render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: true, onToggle: () => {} },
    });

    const header = screen.getByRole("button", { name: /Personal/i });
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });

  it("calls onToggle when clicking the header", async () => {
    const onToggle = mock(() => {});
    render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle },
    });

    await fireEvent.click(screen.getByRole("button", { name: /Personal/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle when collapsed and clicking the header", async () => {
    const onToggle = mock(() => {});
    render(CollapsibleSection, {
      props: { title: "Account", icon: "🔑", collapsed: true, onToggle },
    });

    await fireEvent.click(screen.getByRole("button", { name: /Account/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("chevron has collapsed class when collapsed=true", () => {
    const { container } = render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: true, onToggle: () => {} },
    });

    const chevron = container.querySelector(".chevron");
    expect(chevron?.classList.contains("collapsed")).toBe(true);
  });

  it("chevron does NOT have collapsed class when expanded", () => {
    const { container } = render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle: () => {} },
    });

    const chevron = container.querySelector(".chevron");
    expect(chevron?.classList.contains("collapsed")).toBe(false);
  });

  it("has chevron element present", () => {
    const { container } = render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle: () => {} },
    });

    const chevron = container.querySelector(".chevron");
    expect(chevron).toBeInTheDocument();
  });

  it("shows content when collapsed=false - section-content div is present", () => {
    const { container } = render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: false, onToggle: () => {} },
    });

    const content = container.querySelector(".section-content");
    expect(content).toBeInTheDocument();
  });

  it("hides content when collapsed=true - section-content div is absent", () => {
    const { container } = render(CollapsibleSection, {
      props: { title: "Personal", icon: "👤", collapsed: true, onToggle: () => {} },
    });

    const content = container.querySelector(".section-content");
    expect(content).not.toBeInTheDocument();
  });
});
