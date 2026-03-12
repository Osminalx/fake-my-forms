import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";
import FillButton from "../../src/entrypoints/popup/components/fillButton.svelte";

afterEach(cleanup);

describe("FillButton component", () => {
  it("renders the Fill All Inputs button", () => {
    render(FillButton, { props: { onFill: () => {} } });
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Fill All Inputs");
  });

  it("calls onFill when clicked", async () => {
    const onFill = mock(() => {});
    render(FillButton, { props: { onFill } });

    await fireEvent.click(screen.getByRole("button"));

    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("shows 'Filled!' text immediately after click", async () => {
    render(FillButton, { props: { onFill: () => {} } });

    await fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("Filled!");
  });

  it("disables the button while filling", async () => {
    render(FillButton, { props: { onFill: () => {} } });
    const btn = screen.getByRole("button");

    await fireEvent.click(btn);

    expect(btn).toBeDisabled();
  });

  it("does not call onFill a second time when clicking a disabled button", async () => {
    const onFill = mock(() => {});
    render(FillButton, { props: { onFill } });
    const btn = screen.getByRole("button");

    await fireEvent.click(btn); // first click — starts filling
    await fireEvent.click(btn); // second click — should be ignored (disabled)

    expect(onFill).toHaveBeenCalledTimes(1);
  });
});
