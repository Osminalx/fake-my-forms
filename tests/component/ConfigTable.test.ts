import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, within, cleanup } from "@testing-library/svelte";

afterEach(cleanup);
import ConfigTable from "../../src/entrypoints/popup/components/configTable.svelte";
import { FIELDS } from "../../src/lib/fields";

const sampleFields = FIELDS.slice(0, 3); // email, firstName, lastName

describe("ConfigTable component", () => {
  it("renders a row for each field", () => {
    render(ConfigTable, {
      props: {
        fields: sampleFields,
        customValues: {},
        onAddValue: () => {},
        onRemoveValue: () => {},
      },
    });

    for (const field of sampleFields) {
      expect(screen.getByText(field.label)).toBeInTheDocument();
    }
  });

  it("shows 'auto (faker)' badge when no custom values exist", () => {
    render(ConfigTable, {
      props: {
        fields: sampleFields,
        customValues: {},
        onAddValue: () => {},
        onRemoveValue: () => {},
      },
    });

    const badges = screen.getAllByText("auto (faker)");
    expect(badges.length).toBe(sampleFields.length);
  });

  it("renders existing custom value chips", () => {
    render(ConfigTable, {
      props: {
        fields: sampleFields,
        customValues: { email: ["foo@bar.com", "baz@qux.com"] },
        onAddValue: () => {},
        onRemoveValue: () => {},
      },
    });

    expect(screen.getByText("foo@bar.com")).toBeInTheDocument();
    expect(screen.getByText("baz@qux.com")).toBeInTheDocument();
  });

  it("hides 'auto (faker)' badge for a field that has custom values", () => {
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]], // only email
        customValues: { email: ["test@example.com"] },
        onAddValue: () => {},
        onRemoveValue: () => {},
      },
    });

    expect(screen.queryByText("auto (faker)")).not.toBeInTheDocument();
  });

  it("calls onAddValue when clicking the + button", async () => {
    const onAddValue = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {},
        onAddValue,
        onRemoveValue: () => {},
      },
    });

    const addInput = screen.getByPlaceholderText("add custom value…");
    await fireEvent.input(addInput, { target: { value: "new@email.com" } });
    await fireEvent.click(screen.getByRole("button", { name: "Add value" }));

    expect(onAddValue).toHaveBeenCalledWith("email", "new@email.com");
  });

  it("calls onAddValue when pressing Enter in the add input", async () => {
    const onAddValue = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {},
        onAddValue,
        onRemoveValue: () => {},
      },
    });

    const addInput = screen.getByPlaceholderText("add custom value…");
    await fireEvent.input(addInput, { target: { value: "enter@test.com" } });
    await fireEvent.keyDown(addInput, { key: "Enter" });

    expect(onAddValue).toHaveBeenCalledWith("email", "enter@test.com");
  });

  it("does NOT call onAddValue for empty input", async () => {
    const onAddValue = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {},
        onAddValue,
        onRemoveValue: () => {},
      },
    });

    await fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    expect(onAddValue).not.toHaveBeenCalled();
  });

  it("calls onRemoveValue when clicking the ✕ button on a chip", async () => {
    const onRemoveValue = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: { email: ["remove-me@test.com"] },
        onAddValue: () => {},
        onRemoveValue,
      },
    });

    const removeBtn = screen.getByRole("button", { name: "Remove" });
    await fireEvent.click(removeBtn);

    expect(onRemoveValue).toHaveBeenCalledWith("email", 0);
  });

  it("renders remove buttons for each custom value chip", () => {
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: { email: ["a@a.com", "b@b.com", "c@c.com"] },
        onAddValue: () => {},
        onRemoveValue: () => {},
      },
    });

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    expect(removeButtons.length).toBe(3);
  });
});
