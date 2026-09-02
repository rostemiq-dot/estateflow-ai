export const PROPERTY_PURPOSES = ["Sale", "Rent"] as const;
export const PROPERTY_STATUSES = [
  "Available",
  "Reserved",
  "Under offer",
  "Sold",
  "Rented",
] as const;
export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "House",
  "Commercial",
  "Land",
] as const;
export const PROPERTY_CURRENCIES = ["USD", "IQD"] as const;

export type PropertyPurpose = (typeof PROPERTY_PURPOSES)[number];
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PropertyCurrency = (typeof PROPERTY_CURRENCIES)[number];

export type Property = {
  id: string;
  referenceCode?: string;
  title: string;
  district: string;
  location: string;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  propertyType: PropertyType;
  price: number;
  currency: PropertyCurrency;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  ownerName: string;
  ownerPhone?: string;
  description?: string;
  features?: string[];
  images?: string[];
  matchScore: number;
  inquiriesThisWeek: number;
  viewingsThisWeek: number;
  updatedLabel: string;
  createdAt: string;
  updatedAt: string;
};

export const properties: Property[] = [
  {
    id: "PROP-001",
    title: "Modern family villa",
    district: "Italian Village",
    location: "Erbil, Kurdistan Region",
    purpose: "Sale",
    status: "Available",
    propertyType: "Villa",
    price: 325000,
    currency: "USD",
    bedrooms: 4,
    bathrooms: 4,
    areaSqm: 320,
    ownerName: "Soran Mahmood",
    ownerPhone: "+964 750 000 0001",
    description:
      "A spacious modern villa designed for family living in Italian Village. It offers comfortable indoor spaces, a private outdoor area, and a secure location close to the city.",
    features: [
      "Private garden",
      "Covered parking",
      "24/7 security",
      "Generator backup",
      "Central cooling",
      "Family living room",
    ],
    matchScore: 94,
    inquiriesThisWeek: 12,
    viewingsThisWeek: 3,
    updatedLabel: "Updated 2 hours ago",
    createdAt: "2026-07-10T08:30:00.000Z",
    updatedAt: "2026-07-23T11:00:00.000Z",
  },
  {
    id: "PROP-002",
    title: "Bright executive apartment",
    district: "Empire World",
    location: "Erbil, Kurdistan Region",
    purpose: "Rent",
    status: "Available",
    propertyType: "Apartment",
    price: 1800,
    currency: "USD",
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 145,
    ownerName: "Dilan Ahmed",
    ownerPhone: "+964 750 000 0002",
    description:
      "A bright executive apartment in Empire World, ideal for professionals or a small family looking for a premium rental home in a central community.",
    features: [
      "Furnished option",
      "Elevator access",
      "Building reception",
      "24/7 security",
      "Parking space",
      "Generator backup",
    ],
    matchScore: 88,
    inquiriesThisWeek: 8,
    viewingsThisWeek: 2,
    updatedLabel: "Updated yesterday",
    createdAt: "2026-07-14T10:15:00.000Z",
    updatedAt: "2026-07-22T09:30:00.000Z",
  },
  {
    id: "PROP-003",
    title: "Private garden home",
    district: "Dream City",
    location: "Erbil, Kurdistan Region",
    purpose: "Sale",
    status: "Under offer",
    propertyType: "House",
    price: 245000,
    currency: "USD",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 250,
    ownerName: "Aso Karim",
    ownerPhone: "+964 750 000 0003",
    description:
      "A peaceful garden home in Dream City with generous living areas and a private outdoor space. Currently under offer while the buyer decision is being finalized.",
    features: [
      "Private garden",
      "Family kitchen",
      "Covered parking",
      "Security service",
      "Water storage",
      "Generator backup",
    ],
    matchScore: 91,
    inquiriesThisWeek: 15,
    viewingsThisWeek: 5,
    updatedLabel: "Updated 3 hours ago",
    createdAt: "2026-07-07T13:45:00.000Z",
    updatedAt: "2026-07-23T10:00:00.000Z",
  },
  {
    id: "PROP-004",
    title: "Commercial showroom",
    district: "Ankawa",
    location: "Erbil, Kurdistan Region",
    purpose: "Rent",
    status: "Reserved",
    propertyType: "Commercial",
    price: 2500,
    currency: "USD",
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 180,
    ownerName: "Rojin Saeed",
    ownerPhone: "+964 750 000 0004",
    description:
      "A visible commercial showroom in Ankawa, suitable for retail, furniture, showroom, or a customer-facing office. Reserved while final paperwork is being prepared.",
    features: [
      "Main road visibility",
      "Front display windows",
      "Customer parking nearby",
      "Generator backup",
      "Suitable for retail",
      "Security service",
    ],
    matchScore: 76,
    inquiriesThisWeek: 6,
    viewingsThisWeek: 1,
    updatedLabel: "Updated Monday",
    createdAt: "2026-07-04T07:20:00.000Z",
    updatedAt: "2026-07-20T12:10:00.000Z",
  },
];
