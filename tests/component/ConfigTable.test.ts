import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, fireEvent, screen, within, cleanup } from "@testing-library/svelte";

afterEach(cleanup);
import ConfigTable from "../../src/entrypoints/popup/components/configTable.svelte";
import { FIELDS } from "../../src/lib/fields";
import type { CustomValueWeight } from "../../src/lib/fakerEngine";

const sampleFields = FIELDS.slice(0, 3); // email, firstName, lastName

describe("ConfigTable component", () => {
  it("renders a row for each field", () => {
    render(ConfigTable, {
      props: {
        fields: sampleFields,
        customValues: {},
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
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
        onUpdateWeight: () => {},
      },
    });

    const badges = screen.getAllByText("auto (faker)");
    expect(badges.length).toBe(sampleFields.length);
  });

  it("renders existing custom value chips with weight inputs", () => {
    render(ConfigTable, {
      props: {
        fields: sampleFields,
        customValues: {
          email: [
            { value: "foo@bar.com", weight: 100 },
            { value: "baz@qux.com", weight: 50 },
          ] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
      },
    });

    expect(screen.getByText("foo@bar.com")).toBeInTheDocument();
    expect(screen.getByText("baz@qux.com")).toBeInTheDocument();
  });

  it("hides 'auto (faker)' badge for a field that has custom values", () => {
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]], // only email
        customValues: {
          email: [{ value: "test@example.com", weight: 100 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
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
        onUpdateWeight: () => {},
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
        onUpdateWeight: () => {},
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
        onUpdateWeight: () => {},
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
        customValues: {
          email: [{ value: "remove-me@test.com", weight: 100 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue,
        onUpdateWeight: () => {},
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
        customValues: {
          email: [
            { value: "a@a.com", weight: 100 },
            { value: "b@b.com", weight: 100 },
            { value: "c@c.com", weight: 100 },
          ] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
      },
    });

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    expect(removeButtons.length).toBe(3);
  });

  // --- Weight input tests ---

  it("renders a weight input for each custom value chip", () => {
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [
            { value: "a@a.com", weight: 100 },
            { value: "b@b.com", weight: 50 },
          ] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
      },
    });

    const weightInputs = screen.getAllByRole("spinbutton");
    expect(weightInputs.length).toBe(2);
  });

  it("weight input shows correct default value (100)", () => {
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [
            { value: "a@a.com", weight: 100 },
            { value: "b@b.com", weight: 50 },
          ] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight: () => {},
      },
    });

    const weightInputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(weightInputs[0].value).toBe("100");
    expect(weightInputs[1].value).toBe("50");
  });

  it("calls onUpdateWeight with clamped weight on blur when value exceeds max (150 → 100)", async () => {
    const onUpdateWeight = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [{ value: "test@test.com", weight: 100 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight,
      },
    });

    const weightInput = screen.getByRole("spinbutton");
    await fireEvent.input(weightInput, { target: { value: "150" } });
    await fireEvent.blur(weightInput);

    expect(onUpdateWeight).toHaveBeenCalledWith("email", 0, 100);
  });

  it("calls onUpdateWeight with clamped weight on blur when value is negative (-10 → 0)", async () => {
    const onUpdateWeight = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [{ value: "test@test.com", weight: 100 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight,
      },
    });

    const weightInput = screen.getByRole("spinbutton");
    await fireEvent.input(weightInput, { target: { value: "-10" } });
    await fireEvent.blur(weightInput);

    expect(onUpdateWeight).toHaveBeenCalledWith("email", 0, 0);
  });

  it("does NOT call onUpdateWeight if weight unchanged on blur", async () => {
    const onUpdateWeight = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [{ value: "test@test.com", weight: 100 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight,
      },
    });

    const weightInput = screen.getByRole("spinbutton");
    // Don't change the value, just blur
    await fireEvent.blur(weightInput);

    expect(onUpdateWeight).not.toHaveBeenCalled();
  });

  it("resets to 100 on blur when weight input is empty", async () => {
    const onUpdateWeight = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [{ value: "test@test.com", weight: 80 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight,
      },
    });

    const weightInput = screen.getByRole("spinbutton");
    await fireEvent.input(weightInput, { target: { value: "" } });
    await fireEvent.blur(weightInput);

    expect(onUpdateWeight).toHaveBeenCalledWith("email", 0, 100);
  });

  it("resets to 100 on blur when weight input is non-numeric", async () => {
    const onUpdateWeight = mock(() => {});
    render(ConfigTable, {
      props: {
        fields: [sampleFields[0]],
        customValues: {
          email: [{ value: "test@test.com", weight: 80 }] as CustomValueWeight[],
        },
        onAddValue: () => {},
        onRemoveValue: () => {},
        onUpdateWeight,
      },
    });

    const weightInput = screen.getByRole("spinbutton");
    await fireEvent.input(weightInput, { target: { value: "abc" } });
    await fireEvent.blur(weightInput);

    expect(onUpdateWeight).toHaveBeenCalledWith("email", 0, 100);
  });
});
