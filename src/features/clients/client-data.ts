import type {
  PropertyCurrency,
  PropertyType,
} from "../properties/property-data";

export const CLIENT_STAGES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Viewing",
  "Negotiating",
  "Closed",
] as const;

export const CLIENT_PURPOSES = ["Buy", "Rent"] as const;

export type ClientStage = (typeof CLIENT_STAGES)[number];
export type ClientPurpose = (typeof CLIENT_PURPOSES)[number];

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  purpose: ClientPurpose;
  budgetMin: number;
  budgetMax: number;
  currency: PropertyCurrency;
  preferredAreas: string[];
  propertyTypes: PropertyType[];
  minBedrooms: number;
  propertyNeeds: string;
  stage: ClientStage;
  leadScore: number;
  assignedAgent: string;
  followUp: string;
  followUpAt: string;
  smartSummary: string;
  recommendedAction: string;
  createdAt: string;
  updatedAt: string;
};

export const clients: Client[] = [
  {
    id: "CLI-1001",
    name: "Aso Karim",
    phone: "+964 750 123 4567",
    email: "aso.karim@example.com",
    purpose: "Buy",
    budgetMin: 180000,
    budgetMax: 350000,
    currency: "USD",
    preferredAreas: ["Italian Village", "Empire World"],
    propertyTypes: ["Villa", "House"],
    minBedrooms: 3,
    propertyNeeds: "3-bedroom villa, garden, parking",
    stage: "Viewing",
    leadScore: 92,
    assignedAgent: "Mohammed",
    followUp: "Today · 4:30 PM",
    followUpAt: "2026-07-23T16:30:00.000Z",
    smartSummary: "High-intent buyer · Budget and requirements confirmed",
    recommendedAction: "Confirm the next viewing and send the best villa.",
    createdAt: "2026-07-12T09:00:00.000Z",
    updatedAt: "2026-07-23T10:30:00.000Z",
  },
  {
    id: "CLI-1002",
    name: "Dilan Ahmed",
    phone: "+964 751 234 5678",
    email: "dilan.ahmed@example.com",
    purpose: "Rent",
    budgetMin: 900,
    budgetMax: 2000,
    currency: "USD",
    preferredAreas: ["Ankawa", "Empire World"],
    propertyTypes: ["Apartment"],
    minBedrooms: 2,
    propertyNeeds: "Modern 2-bedroom apartment, furnished",
    stage: "Qualified",
    leadScore: 84,
    assignedAgent: "Mohammed",
    followUp: "Tomorrow · 11:00 AM",
    followUpAt: "2026-07-24T11:00:00.000Z",
    smartSummary: "Budget confirmed · Ready for suitable options",
    recommendedAction: "Send the strongest matching apartments.",
    createdAt: "2026-07-15T11:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
  {
    id: "CLI-1003",
    name: "Rojin Saeed",
    phone: "+964 770 345 6789",
    email: "rojin.saeed@example.com",
    purpose: "Buy",
    budgetMin: 110000,
    budgetMax: 260000,
    currency: "USD",
    preferredAreas: ["Dream City", "Ankawa"],
    propertyTypes: ["House", "Villa"],
    minBedrooms: 3,
    propertyNeeds: "Family home with 3 bedrooms",
    stage: "Contacted",
    leadScore: 68,
    assignedAgent: "Mohammed",
    followUp: "Friday · 2:00 PM",
    followUpAt: "2026-07-24T14:00:00.000Z",
    smartSummary: "Family buyer · Area preference confirmed",
    recommendedAction: "Confirm financing and move-in timing.",
    createdAt: "2026-07-18T08:45:00.000Z",
    updatedAt: "2026-07-21T14:20:00.000Z",
  },
  {
    id: "CLI-1004",
    name: "Hardi Omar",
    phone: "+964 750 456 7890",
    email: "hardi.omar@example.com",
    purpose: "Rent",
    budgetMin: 650,
    budgetMax: 1900,
    currency: "USD",
    preferredAreas: ["Empire World", "Gulan Street"],
    propertyTypes: ["Apartment"],
    minBedrooms: 1,
    propertyNeeds: "One-bedroom furnished apartment",
    stage: "New Lead",
    leadScore: 48,
    assignedAgent: "Mohammed",
    followUp: "Today · 6:00 PM",
    followUpAt: "2026-07-23T18:00:00.000Z",
    smartSummary: "New rental enquiry · Needs qualification",
    recommendedAction: "Confirm budget, lease length, and furnishing needs.",
    createdAt: "2026-07-22T07:30:00.000Z",
    updatedAt: "2026-07-22T07:30:00.000Z",
  },
];
