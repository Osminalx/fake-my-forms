import type { FieldGroup } from "./types";

export interface FieldDef {
  type: string;
  icon: string;
  label: string;
  group: FieldGroup;
}

export const FIELDS: FieldDef[] = [
  { type: "email", icon: "📧", label: "email", group: "contact" },
  { type: "firstName", icon: "👤", label: "firstName", group: "personal" },
  { type: "lastName", icon: "👤", label: "lastName", group: "personal" },
  { type: "phone", icon: "📞", label: "phone", group: "contact" },
  { type: "address", icon: "🏠", label: "address", group: "location" },
  { type: "city", icon: "🌆", label: "city", group: "location" },
  { type: "zipCode", icon: "📮", label: "zipCode", group: "location" },
  { type: "company", icon: "🏢", label: "company", group: "account" },
  { type: "username", icon: "🔑", label: "username", group: "account" },
  { type: "password", icon: "🔒", label: "password", group: "account" },
];
