export const DOCUMENT_CATEGORIES = [
  "ID",
  "Property Ownership",
  "Contract",
  "Offer",
  "Payment Receipt",
  "Floor Plan",
  "Photo",
  "Other",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type EntityType =
  "Property" | "Client" | "Deal" | "Contract" | "Offer" | "Payment";
export type DocumentMetadata = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
  updatedAt: string;
};
