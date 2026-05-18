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
