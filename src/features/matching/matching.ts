import type { Client } from "../clients/client-data";
import type { Property, PropertyType } from "../properties/property-data";

export type MatchCriterionKey =
  "purpose" | "budget" | "district" | "propertyType" | "bedrooms";

export type MatchCriterion = {
  key: MatchCriterionKey;
  label: string;
  matched: boolean;
  earned: number;
  possible: number;
  detail: string;
};

export type PropertyClientMatch = {
  client: Client;
  property: Property;
  score: number;
  criteria: MatchCriterion[];
  isAvailable: boolean;
  strength: "Excellent" | "Strong" | "Possible" | "Low";
};

const weights: Record<MatchCriterionKey, number> = {
  purpose: 25,
  budget: 25,
  district: 20,
  propertyType: 15,
  bedrooms: 15,
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function inferPropertyTypes(client: Client): PropertyType[] {
  if (client.propertyTypes.length > 0) {
    return client.propertyTypes;
  }

  const needs = normalize(client.propertyNeeds);
  const knownTypes: PropertyType[] = [
    "Apartment",
    "Villa",
    "House",
    "Commercial",
    "Land",
  ];

  return knownTypes.filter((propertyType) =>
    needs.includes(normalize(propertyType)),
  );
}

function inferBedrooms(client: Client) {
  if (client.minBedrooms > 0) {
    return client.minBedrooms;
  }

  const match = client.propertyNeeds.match(/(\d+)\s*-?\s*bed/i);
  return match ? Number(match[1]) : 0;
}

function getStrength(score: number): PropertyClientMatch["strength"] {
  if (score >= 85) {
    return "Excellent";
  }

  if (score >= 70) {
    return "Strong";
  }

  if (score >= 50) {
    return "Possible";
  }

  return "Low";
}

export function calculatePropertyClientMatch(
  client: Client,
  property: Property,
): PropertyClientMatch {
  const requiredPurpose = client.purpose === "Buy" ? "Sale" : "Rent";
  const purposeMatched = property.purpose === requiredPurpose;
  const sameCurrency = property.currency === client.currency;
  const exactBudgetMatch =
    sameCurrency &&
    property.price >= client.budgetMin &&
    property.price <= client.budgetMax;
  const nearBudgetMatch =
    sameCurrency &&
    property.price >= client.budgetMin * 0.9 &&
    property.price <= client.budgetMax * 1.1;
  const preferredAreas = client.preferredAreas.map(normalize);
  const districtMatched =
    preferredAreas.length === 0 ||
    preferredAreas.some((area) => {
      const district = normalize(property.district);
      return (
        district === area || district.includes(area) || area.includes(district)
      );
    });
  const propertyTypes = inferPropertyTypes(client);
  const propertyTypeMatched =
    propertyTypes.length === 0 || propertyTypes.includes(property.propertyType);
  const minBedrooms = inferBedrooms(client);
  const bedroomsMatched =
    minBedrooms === 0 ||
    property.propertyType === "Commercial" ||
    property.propertyType === "Land" ||
    property.bedrooms >= minBedrooms;

  const criteria: MatchCriterion[] = [
    {
      key: "purpose",
      label: "Purpose",
      matched: purposeMatched,
      earned: purposeMatched ? weights.purpose : 0,
      possible: weights.purpose,
      detail: purposeMatched
        ? `${client.purpose} request matches this ${property.purpose.toLowerCase()} listing`
        : `Client wants to ${client.purpose.toLowerCase()}, but this property is for ${property.purpose.toLowerCase()}`,
    },
    {
      key: "budget",
      label: "Budget",
      matched: exactBudgetMatch,
      earned: exactBudgetMatch
        ? weights.budget
        : nearBudgetMatch
          ? Math.round(weights.budget / 2)
          : 0,
      possible: weights.budget,
      detail: !sameCurrency
        ? `Currency differs: client uses ${client.currency}, listing uses ${property.currency}`
        : exactBudgetMatch
          ? "Property price is inside the client budget"
          : nearBudgetMatch
            ? "Property price is close to the client budget"
            : "Property price is outside the client budget",
    },
    {
      key: "district",
      label: "Area",
      matched: districtMatched,
      earned: districtMatched ? weights.district : 0,
      possible: weights.district,
      detail:
        preferredAreas.length === 0
          ? "Client is open to any area"
          : districtMatched
            ? `${property.district} is a preferred area`
            : `${property.district} is outside the preferred areas`,
    },
    {
      key: "propertyType",
      label: "Type",
      matched: propertyTypeMatched,
      earned: propertyTypeMatched ? weights.propertyType : 0,
      possible: weights.propertyType,
      detail:
        propertyTypes.length === 0
          ? "Client is open to any property type"
          : propertyTypeMatched
            ? `${property.propertyType} matches the requested type`
            : `Requested: ${propertyTypes.join(" or ")}`,
    },
    {
      key: "bedrooms",
      label: "Bedrooms",
      matched: bedroomsMatched,
      earned: bedroomsMatched ? weights.bedrooms : 0,
      possible: weights.bedrooms,
      detail:
        minBedrooms === 0
          ? "No minimum bedroom requirement"
          : bedroomsMatched
            ? `${property.bedrooms} bedrooms meets the ${minBedrooms}+ requirement`
            : `${property.bedrooms} bedrooms is below the ${minBedrooms}+ requirement`,
    },
  ];
  const score = criteria.reduce(
    (total, criterion) => total + criterion.earned,
    0,
  );

  return {
    client,
    property,
    score,
    criteria,
    isAvailable: property.status === "Available",
    strength: getStrength(score),
  };
}

export function getMatchesForClient(
  client: Client,
  properties: readonly Property[],
  includeLowMatches = false,
) {
  return properties
    .map((property) => calculatePropertyClientMatch(client, property))
    .filter(
      (match) => match.isAvailable && (includeLowMatches || match.score >= 50),
    )
    .sort(
      (first, second) =>
        second.score - first.score ||
        first.property.price - second.property.price,
    );
}

export function getMatchesForProperty(
  property: Property,
  clients: readonly Client[],
  includeLowMatches = false,
) {
  return clients
    .map((client) => calculatePropertyClientMatch(client, property))
    .filter((match) => includeLowMatches || match.score >= 50)
    .sort(
      (first, second) =>
        second.score - first.score ||
        second.client.leadScore - first.client.leadScore,
    );
}

export function getAllSmartMatches(
  clients: readonly Client[],
  properties: readonly Property[],
) {
  return clients
    .flatMap((client) => getMatchesForClient(client, properties))
    .sort((first, second) => second.score - first.score);
}
