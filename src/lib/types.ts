/** Supported tab identifiers for the bottom navigation. */
export type TabId = "config" | "preview" | "per-fill" | "settings";

/** Definition for a single bottom-navigation tab. */
export interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

/** Semantic field grouping keys. */
export type FieldGroup = "personal" | "contact" | "location" | "account";

/** Metadata about a field group. */
export interface FieldGroupMeta {
  label: string;
  icon: string;
}

/** Lookup table of group key → display metadata. */
export const FIELD_GROUP_META: Record<FieldGroup, FieldGroupMeta> = {
  personal: { label: "Personal", icon: "👤" },
  contact: { label: "Contact", icon: "📧" },
  location: { label: "Location", icon: "📍" },
  account: { label: "Account", icon: "🔑" },
};

/** Ordered list of group keys (controls render order). */
export const FIELD_GROUP_ORDER: FieldGroup[] = [
  "personal",
  "contact",
  "location",
  "account",
];

/**
 * Data-only type for a single field's preview entry.
 * Crosses the runtime message boundary — no DOM references.
 */
export interface PreviewEntry {
  /** Element id or auto-generated `_fmf_N` */
  id: string;
  /** Detected label text */
  label: string;
  /** Detected field type */
  fieldType: string;
  /** Generated value (null if no value could be generated) */
  value: string | null;
  /** True if this is a React/Vue custom dropdown */
  isFrameworkDropdown: boolean;
  /** For grouping confirm-pair entries together */
  groupType: "single" | "confirm-primary" | "confirm";
  /** Stable key: primary field's id for confirm-pairs, own id for singles */
  groupId: string;
}

/** Response shape for the PREVIEW_FILL message. */
export interface PreviewResponse {
  entries: PreviewEntry[];
}
