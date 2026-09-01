import type {
  Property,
  PropertyCurrency,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
} from "./property-data";

export type PropertySort =
  "recently-updated" | "highest-price" | "lowest-price" | "newest";

export type PropertyFilters = {
  search: string;
  purpose: "All" | PropertyPurpose;
  status: "All" | PropertyStatus;
  propertyType: "All" | PropertyType;
  district: "All" | string;
  sort: PropertySort;
};

export type PropertyStats = {
  total: number;
  available: number;
  forSale: number;
  forRent: number;
  closed: number;
};

const IQD_PER_USD_FOR_SORTING = 1310;

function getComparablePrice(property: Property) {
  return property.currency === "USD"
    ? property.price * IQD_PER_USD_FOR_SORTING
    : property.price;
}

function getTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function filterAndSortProperties(
  propertyList: readonly Property[],
  filters: PropertyFilters,
) {
  const searchTerm = filters.search.trim().toLocaleLowerCase();

  return propertyList
    .filter((property) => {
      const matchesSearch =
        searchTerm.length === 0 ||
        [
          property.title,
          property.district,
          property.location,
          property.ownerName,
          property.ownerPhone ?? "",
          property.propertyType,
          property.id,
        ].some((value) => value.toLocaleLowerCase().includes(searchTerm));
      const matchesPurpose =
        filters.purpose === "All" || property.purpose === filters.purpose;
      const matchesStatus =
        filters.status === "All" || property.status === filters.status;
      const matchesType =
        filters.propertyType === "All" ||
        property.propertyType === filters.propertyType;
      const matchesDistrict =
        filters.district === "All" || property.district === filters.district;

      return (
        matchesSearch &&
        matchesPurpose &&
        matchesStatus &&
        matchesType &&
        matchesDistrict
      );
    })
    .sort((first, second) => {
      switch (filters.sort) {
        case "highest-price":
          return getComparablePrice(second) - getComparablePrice(first);
        case "lowest-price":
          return getComparablePrice(first) - getComparablePrice(second);
        case "newest":
          return getTimestamp(second.createdAt) - getTimestamp(first.createdAt);
        case "recently-updated":
        default:
          return getTimestamp(second.updatedAt) - getTimestamp(first.updatedAt);
      }
    });
}

export function getActivePropertyFilterCount(filters: PropertyFilters) {
  return [
    filters.search.trim().length > 0,
    filters.purpose !== "All",
    filters.status !== "All",
    filters.propertyType !== "All",
    filters.district !== "All",
  ].filter(Boolean).length;
}

export function getPropertyStats(
  propertyList: readonly Property[],
): PropertyStats {
  return propertyList.reduce<PropertyStats>(
    (stats, property) => {
      stats.total += 1;
      stats.available += property.status === "Available" ? 1 : 0;
      stats.forSale += property.purpose === "Sale" ? 1 : 0;
      stats.forRent += property.purpose === "Rent" ? 1 : 0;
      stats.closed +=
        property.status === "Sold" || property.status === "Rented" ? 1 : 0;

      return stats;
    },
    {
      total: 0,
      available: 0,
      forSale: 0,
      forRent: 0,
      closed: 0,
    },
  );
}

export function createPropertyId(
  propertyList: readonly Pick<Property, "id">[],
) {
  const existingIds = new Set(propertyList.map((property) => property.id));

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const randomNumber =
      typeof crypto !== "undefined" && "getRandomValues" in crypto
        ? crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
        : (Date.now() + attempt * 7919) % 1_000_000;
    const id = `PROP-${String(randomNumber).padStart(6, "0")}`;

    if (!existingIds.has(id)) {
      return id;
    }
  }

  return `PROP-${Date.now().toString().slice(-6)}`;
}

export function createEmptyProperty(
  propertyList: readonly Pick<Property, "id">[],
): Property {
  const now = new Date().toISOString();

  return {
    id: createPropertyId(propertyList),
    title: "",
    district: "",
    location: "Erbil, Kurdistan Region",
    purpose: "Sale",
    status: "Available",
    propertyType: "Villa",
    price: 0,
    currency: "USD",
    bedrooms: 0,
    bathrooms: 0,
    areaSqm: 0,
    ownerName: "",
    ownerPhone: "",
    description: "",
    features: [],
    images: [],
    matchScore: 0,
    inquiriesThisWeek: 0,
    viewingsThisWeek: 0,
    updatedLabel: "Added just now",
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateProperty(
  property: Property,
  propertyList: readonly Property[],
): Property {
  const now = new Date().toISOString();

  return {
    ...property,
    id: createPropertyId(propertyList),
    title: `${property.title} Copy`,
    features: property.features ? [...property.features] : [],
    images: property.images ? [...property.images] : [],
    status: "Available",
    matchScore: 0,
    inquiriesThisWeek: 0,
    viewingsThisWeek: 0,
    updatedLabel: "Duplicated just now",
    createdAt: now,
    updatedAt: now,
  };
}

export function formatPropertyPrice(price: number, currency: PropertyCurrency) {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }

  return `${new Intl.NumberFormat("en-US").format(price)} IQD`;
}

export function formatPropertyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
