import { ClientLeadSource, ClientLeadStatus, ClientPriority, NotificationType, PropertyMediaType, PropertyStatus, ViewingStatus } from "@prisma/client";
import { Router } from "express";
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

const requestLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

function allowRequest(ip: string) {
  const now = Date.now();
  const current = requestLimit.get(ip);
  if (!current || current.resetAt <= now) {
    requestLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

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

router.post("/:propertyId/viewing-request", async (req, res, next) => {
  try {
    if (!allowRequest(req.ip || "unknown")) {
      res.status(429).json({ error: { message: "Too many requests. Please try again later." } });
      return;
    }

    const { name, phone, whatsapp, preferredDate, preferredTime, timezone, message, website } = req.body ?? {};
    if (website) {
      res.status(400).json({ error: { message: "Unable to submit request." } });
      return;
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanWhatsapp = typeof whatsapp === "string" ? whatsapp.trim() : "";
    const cleanDate = typeof preferredDate === "string" ? preferredDate.trim() : "";
    const cleanTime = typeof preferredTime === "string" ? preferredTime.trim() : "";
    const cleanTimezone = typeof timezone === "string" ? timezone.trim() : "UTC";
    const cleanMessage = typeof message === "string" ? message.trim() : "";

    if (cleanName.length < 2 || cleanName.length > 201) {
      res.status(400).json({ error: { message: "Please enter your full name." } });
      return;
    }
    if (!/^[+()\-\s\d]{7,30}$/.test(cleanPhone)) {
      res.status(400).json({ error: { message: "Please enter a valid phone number." } });
      return;
    }
    if (cleanWhatsapp && !/^[+()\-\s\d]{7,30}$/.test(cleanWhatsapp)) {
      res.status(400).json({ error: { message: "Please enter a valid WhatsApp number." } });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate) || !/^\d{2}:\d{2}$/.test(cleanTime)) {
      res.status(400).json({ error: { message: "Please choose a valid viewing date and time." } });
      return;
    }
    if (cleanMessage.length > 2000) {
      res.status(400).json({ error: { message: "Message is too long." } });
      return;
    }

    const property = await prisma.property.findFirst({
      where: publicWhere,
      select: {
        id: true,
        title: true,
        referenceCode: true,
        address: true,
        city: true,
        agencyId: true,
        assignedAgentId: true,
        agency: { select: { ownerId: true } },
      },
    });
    if (!property || property.id !== req.params.propertyId) {
      res.status(404).json({ error: { message: "Public property not found" } });
      return;
    }

    const assignedAgentId = property.assignedAgentId ?? property.agency.ownerId ?? (await prisma.user.findFirst({
      where: { agencyId: property.agencyId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }))?.id;

    if (!assignedAgentId) {
      res.status(503).json({ error: { message: "Viewing requests are temporarily unavailable." } });
      return;
    }

    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts.shift() || cleanName;
    const lastName = nameParts.join(" ") || "Visitor";
    const fullName = `${firstName} ${lastName}`.trim();
    const startAt = new Date(`${cleanDate}T${cleanTime}:00`);
    const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);
    if (!Number.isFinite(startAt.getTime()) || startAt.getTime() < Date.now() - 60 * 1000) {
      res.status(400).json({ error: { message: "Please choose a future viewing time." } });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          agencyId: property.agencyId,
          assignedAgentId,
          firstName,
          lastName,
          fullName,
          phone: cleanPhone,
          whatsapp: cleanWhatsapp || cleanPhone,
          leadStatus: ClientLeadStatus.NEW,
          leadSource: ClientLeadSource.PROPERTY_PORTAL,
          priority: ClientPriority.MEDIUM,
          notes: cleanMessage || `Public viewing request for ${property.referenceCode}.`,
        },
      });

      const viewing = await tx.viewing.create({
        data: {
          agencyId: property.agencyId,
          propertyId: property.id,
          clientId: client.id,
          assignedAgentId,
          title: `Public viewing request · ${property.title}`,
          description: cleanMessage || null,
          status: ViewingStatus.SCHEDULED,
          startAt,
          endAt,
          timezone: cleanTimezone || "UTC",
          location: property.address || property.city,
          createdById: assignedAgentId,
        },
      });

      await tx.notification.create({
        data: {
          agencyId: property.agencyId,
          recipientId: assignedAgentId,
          clientId: client.id,
          propertyId: property.id,
          viewingId: viewing.id,
          type: NotificationType.GENERAL,
          title: "New public viewing request",
          message: `${fullName} requested ${cleanDate} at ${cleanTime} for ${property.title}. Phone: ${cleanPhone}${cleanWhatsapp ? ` · WhatsApp: ${cleanWhatsapp}` : ""}`,
        },
      });

      return { clientId: client.id, viewingId: viewing.id };
    });

    res.status(201).json({
      data: {
        ...result,
        message: "Your viewing request was sent successfully. Our team will contact you to confirm the appointment.",
      },
    });
  } catch (error) {
    next(error);
  }
});

export const publicPropertyRouter = router;
