import {
  PropertyMediaType,
  UserRole,
  type PropertyMedia,
} from "@prisma/client";
import type { AuthenticatedUser } from "../../src/modules/auth/types/auth.types.js";

export const agencyId = "22222222-2222-4222-8222-222222222222";
export const userId = "11111111-1111-4111-8111-111111111111";
export const propertyId = "55555555-5555-4555-8555-555555555555";
export const mediaId = "77777777-7777-4777-8777-777777777777";
export const catalogId = "88888888-8888-4888-8888-888888888888";
export const actor: AuthenticatedUser = {
  id: userId,
  email: "owner@example.com",
  agencyId,
  role: UserRole.OWNER,
};
export const mediaInput = {
  mediaType: PropertyMediaType.IMAGE,
  storagePath: "agencies/a/properties/p/image.jpg",
  fileName: "image.jpg",
  mimeType: "image/jpeg",
  fileSize: 2048,
  width: 1600,
  height: 900,
  displayOrder: 0,
  isCover: true,
};
export const mediaFixture: PropertyMedia = {
  id: mediaId,
  propertyId,
  uploadedById: userId,
  ...mediaInput,
  fileSize: BigInt(mediaInput.fileSize),
  thumbnailPath: null,
  duration: null,
  metadata: null,
  createdAt: new Date("2026-07-28T12:00:00.000Z"),
  updatedAt: new Date("2026-07-28T12:00:00.000Z"),
  deletedAt: null,
};
