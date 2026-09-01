import type { Client } from "../features/clients/client-data";
import type { Property } from "../features/properties/property-data";
import { formatPropertyPrice } from "../features/properties/property-utils";

export function normalizeWhatsAppPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function createWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const query = encodeURIComponent(message);

  return normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${query}`
    : `https://wa.me/?text=${query}`;
}

export function createPropertyShareMessage(
  property: Property,
  client?: Pick<Client, "name">,
) {
  const greeting = client ? `Hello ${client.name},` : "Hello,";
  const monthlyLabel = property.purpose === "Rent" ? " per month" : "";

  return `${greeting}

I found a property that may suit you:

${property.title}
${property.propertyType} · ${property.district}
${property.bedrooms} bedrooms · ${property.bathrooms} bathrooms · ${property.areaSqm} m²
${formatPropertyPrice(property.price, property.currency)}${monthlyLabel}

Would you like more details or a viewing?`;
}

export function createClientFollowUpMessage(client: Client) {
  return `Hello ${client.name}, this is Mohammed from EstateFlow. I’m following up about the property you want to ${client.purpose.toLowerCase()}. I have some options to discuss with you. When is a good time to talk?`;
}
