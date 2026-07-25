export type CustomOption = { id: string; label: string; archived: boolean };
export type AppSettings = {
  agencyName: string;
  logo: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  website: string;
  registrationInfo: string;
  contractFooter: string;
  defaultResponsibleAgent: string;
  defaultCurrency: "USD" | "IQD";
  dateFormat: string;
  timeFormat: "12h" | "24h";
  numberFormat: string;
  language: string;
  timeZone: string;
  commissionType: "Percentage" | "Fixed";
  commissionValue: number;
  agentShare: number;
  offerExpirationDays: number;
  viewingReminderHours: number;
  paymentReminderDays: number;
  contractPrefix: string;
  propertyPrefix: string;
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  sidebarCollapsed: boolean;
  customLists: Record<string, CustomOption[]>;
};
export const defaultSettings: AppSettings = {
  agencyName: "EstateFlow Agency",
  logo: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "Erbil, Kurdistan Region",
  website: "",
  registrationInfo: "",
  contractFooter: "Legal review required before use.",
  defaultResponsibleAgent: "Mohammed",
  defaultCurrency: "USD",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  numberFormat: "en-US",
  language: "English",
  timeZone: "Asia/Baghdad",
  commissionType: "Percentage",
  commissionValue: 2.5,
  agentShare: 50,
  offerExpirationDays: 7,
  viewingReminderHours: 24,
  paymentReminderDays: 1,
  contractPrefix: "EF",
  propertyPrefix: "PROP",
  theme: "light",
  density: "comfortable",
  sidebarCollapsed: false,
  customLists: {
    propertyTypes: ["Apartment", "Villa", "House", "Commercial", "Land"].map(
      (label, i) => ({ id: `property-${i}`, label, archived: false }),
    ),
    propertyStatuses: [
      "Available",
      "Reserved",
      "Under offer",
      "Sold",
      "Rented",
    ].map((label, i) => ({ id: `status-${i}`, label, archived: false })),
    clientStatuses: [
      "New Lead",
      "Contacted",
      "Qualified",
      "Viewing",
      "Negotiating",
      "Closed",
    ].map((label, i) => ({ id: `client-${i}`, label, archived: false })),
    industries: [],
    locations: [
      "Erbil",
      "Ankawa",
      "Italian Village",
      "Dream City",
      "Empire World",
    ].map((label, i) => ({ id: `location-${i}`, label, archived: false })),
    leadSources: [],
    paymentMethods: ["Cash", "Bank transfer", "Card", "Cheque", "Other"].map(
      (label, i) => ({ id: `payment-${i}`, label, archived: false }),
    ),
    taskCategories: [],
  },
};
