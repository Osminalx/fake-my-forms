import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";

afterEach(cleanup);

import SettingsMenu from "../../src/entrypoints/popup/components/settingsMenu.svelte";

describe("SettingsMenu component", () => {
  it("renders the locale selector with a label", () => {
    render(SettingsMenu, {
      props: { locale: "es", onAboutClick: () => {} },
    });

    expect(screen.getByText("faker locale")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders the About trigger button", () => {
    render(SettingsMenu, {
      props: { locale: "es", onAboutClick: () => {} },
    });

    expect(screen.getByRole("button", { name: /details/i })).toBeInTheDocument();
  });

  it("calls onAboutClick when About button is clicked", async () => {
    const onAboutClick = mock(() => {});
    render(SettingsMenu, {
      props: { locale: "es", onAboutClick },
    });

    await fireEvent.click(screen.getByRole("button", { name: /details/i }));

    expect(onAboutClick).toHaveBeenCalledTimes(1);
  });

  it("shows the current locale as selected in the dropdown", () => {
    render(SettingsMenu, {
      props: { locale: "fr", onAboutClick: () => {} },
    });

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("fr");
  });
});
