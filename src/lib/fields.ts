export interface FieldDef {
  type: string;
  icon: string;
  label: string;
}

export const FIELDS: FieldDef[] = [
  { type: "email", icon: "📧", label: "email" },
  { type: "firstName", icon: "👤", label: "firstName" },
  { type: "lastName", icon: "👤", label: "lastName" },
  { type: "phone", icon: "📞", label: "phone" },
  { type: "address", icon: "🏠", label: "address" },
  { type: "city", icon: "🌆", label: "city" },
  { type: "zipCode", icon: "📮", label: "zipCode" },
  { type: "company", icon: "🏢", label: "company" },
  { type: "username", icon: "🔑", label: "username" },
  { type: "password", icon: "🔒", label: "password" },
];
