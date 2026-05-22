import { describe, it, expect } from "bun:test";

// PreviewEntry and PreviewResponse types
import type { PreviewEntry, PreviewResponse } from "../../src/lib/types";

describe("PreviewEntry type", () => {
  it("has the correct shape", () => {
    const entry: PreviewEntry = {
      id: "_fmf_0",
      label: "Email",
      fieldType: "email",
      value: "test@example.com",
      isFrameworkDropdown: false,
      groupType: "single",
      groupId: "_fmf_0",
    };

    expect(entry.id).toBe("_fmf_0");
    expect(entry.label).toBe("Email");
    expect(entry.fieldType).toBe("email");
    expect(entry.value).toBe("test@example.com");
    expect(entry.isFrameworkDropdown).toBe(false);
    expect(entry.groupType).toBe("single");
    expect(entry.groupId).toBe(entry.id);
  });

  it("supports confirm-pair groupType", () => {
    const primary: PreviewEntry = {
      id: "email-1",
      label: "Email",
      fieldType: "email",
      value: "a@b.com",
      isFrameworkDropdown: false,
      groupType: "confirm-primary",
      groupId: "email-1",
    };
    const confirm: PreviewEntry = {
      id: "email-2",
      label: "Confirm Email",
      fieldType: "email",
      value: "a@b.com",
      isFrameworkDropdown: false,
      groupType: "confirm",
      groupId: "email-1",
    };

    expect(primary.groupType).toBe("confirm-primary");
    expect(confirm.groupType).toBe("confirm");
    expect(confirm.groupId).toBe(primary.groupId);
    expect(primary.value).toBe(confirm.value);
  });

  it("supports isFrameworkDropdown flag", () => {
    const entry: PreviewEntry = {
      id: "country",
      label: "Country",
      fieldType: "country",
      value: "United States",
      isFrameworkDropdown: true,
      groupType: "single",
      groupId: "country",
    };

    expect(entry.isFrameworkDropdown).toBe(true);
  });

  it("supports null value for unknown fieldType", () => {
    const entry: PreviewEntry = {
      id: "_fmf_0",
      label: "Custom Field",
      fieldType: "unknown",
      value: null,
      isFrameworkDropdown: false,
      groupType: "single",
      groupId: "_fmf_0",
    };

    expect(entry.value).toBeNull();
  });
});

describe("PreviewResponse type", () => {
  it("has entries array", () => {
    const response: PreviewResponse = {
      entries: [
        {
          id: "_fmf_0",
          label: "Email",
          fieldType: "email",
          value: "test@example.com",
          isFrameworkDropdown: false,
          groupType: "single",
          groupId: "_fmf_0",
        },
      ],
    };

    expect(response.entries).toHaveLength(1);
    expect(response.entries[0].id).toBe("_fmf_0");
  });

  it("supports empty entries array", () => {
    const response: PreviewResponse = { entries: [] };
    expect(response.entries).toHaveLength(0);
  });
});
