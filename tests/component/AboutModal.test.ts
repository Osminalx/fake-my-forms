import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, cleanup } from "@testing-library/svelte";

afterEach(cleanup);

import AboutModal from "../../src/entrypoints/popup/components/aboutModal.svelte";

describe("AboutModal component", () => {
  it("renders when show=true", () => {
    render(AboutModal, {
      props: { show: true, onClose: () => {} },
    });

    expect(screen.getByText("FakeIt v0.1.0")).toBeInTheDocument();
  });

  it("does NOT render when show=false", () => {
    render(AboutModal, {
      props: { show: false, onClose: () => {} },
    });

    expect(screen.queryByText("FakeIt v0.1.0")).not.toBeInTheDocument();
  });

  it("renders the close button", () => {
    render(AboutModal, {
      props: { show: true, onClose: () => {} },
    });

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = mock(() => {});
    render(AboutModal, {
      props: { show: true, onClose },
    });

    await fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop overlay is clicked", async () => {
    const onClose = mock(() => {});
    render(AboutModal, {
      props: { show: true, onClose },
    });

    const backdrop = screen.getByTestId("modal-backdrop");
    await fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows extension version and tech stack info", () => {
    render(AboutModal, {
      props: { show: true, onClose: () => {} },
    });

    expect(screen.getByText(/WXT/)).toBeInTheDocument();
    expect(screen.getByText(/Svelte/)).toBeInTheDocument();
    expect(screen.getByText(/faker-js/)).toBeInTheDocument();
  });
});
