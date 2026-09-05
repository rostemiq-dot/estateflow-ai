import { Router } from "express";
import { PropertyStatus, PropertyMediaType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const router = Router();

const publicPropertySelect = {
  id: true,
  title: true,
  description: true,
  referenceCode: true,
  purpose: true,
  propertyType: true,
  status: true,
  price: true,
  currency: true,
  country: true,
  city: true,
  district: true,
  neighborhood: true,
  address: true,
  bedrooms: true,
  bathrooms: true,
  areaSqm: true,
  floor: true,
  totalFloors: true,
  parkingSpaces: true,
  yearBuilt: true,
  furnished: true,
  createdAt: true,
  updatedAt: true,
  media: {
    where: {
      deletedAt: null,
      mediaType: PropertyMediaType.IMAGE,
    },
    orderBy: [{ isCover: "desc" as const }, { displayOrder: "asc" as const }, { createdAt: "asc" as const }],
    select: {
      id: true,
      storagePath: true,
      fileName: true,
      mimeType: true,
      displayOrder: true,
      isCover: true,
    },
  },
};

const publicWhere = {
  status: PropertyStatus.AVAILABLE,
  deletedAt: null,
};

function serializeProperty(property: Awaited<ReturnType<typeof findPublicProperty>>) {
  if (!property) return null;
  return {
    ...property,
    price: property.price.toString(),
    areaSqm: property.areaSqm?.toString() ?? null,
  };
}

function findPublicProperty(id: string) {
  return prisma.property.findFirst({
    where: { ...publicWhere, id },
    select: publicPropertySelect,
  });
}

router.get("/", async (_req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: publicWhere,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: publicPropertySelect,
    });

    res.json({
      data: properties.map((property) => ({
        ...property,
        price: property.price.toString(),
        areaSqm: property.areaSqm?.toString() ?? null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:propertyId", async (req, res, next) => {
  try {
    const property = await findPublicProperty(req.params.propertyId);
    if (!property) {
      res.status(404).json({ error: { message: "Public property not found" } });
      return;
    }
    res.json({ data: serializeProperty(property) });
  } catch (error) {
    next(error);
  }
});

export const publicPropertyRouter = router;
