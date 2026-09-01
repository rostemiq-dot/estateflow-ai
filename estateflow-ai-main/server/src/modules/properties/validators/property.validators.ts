import {
  Currency,
  Prisma,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
} from "@prisma/client";
import { z } from "zod";

const currentYear = new Date().getUTCFullYear();

const decimalInput = (
  maximumIntegerDigits: number,
  scale: number,
  label: string,
  signed = false,
) =>
  z
    .union([z.string(), z.number().finite()])
    .transform((value) => String(value).trim())
    .refine(
      (value) =>
        new RegExp(
          `^${signed ? "-?" : ""}(?:0|[1-9]\\d{0,${maximumIntegerDigits - 1}})(?:\\.\\d{1,${scale}})?$`,
        ).test(value),
      `${label} must be a non-negative decimal with at most ${scale} decimal places`,
    );

const nullableTrimmedString = (maximum: number) =>
  z.string().trim().max(maximum).nullable().optional();

const mutablePropertyFields = {
  assignedAgentId: z.uuid().nullable().optional(),
  title: z.string().trim().min(2).max(180),
  description: nullableTrimmedString(10_000),
  referenceCode: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]*$/)),
  purpose: z.enum(PropertyPurpose),
  propertyType: z.enum(PropertyType),
  status: z.enum(PropertyStatus).optional(),
  price: decimalInput(16, 2, "Price"),
  currency: z.enum(Currency),
  country: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(120),
  district: nullableTrimmedString(120),
  neighborhood: nullableTrimmedString(160),
  address: nullableTrimmedString(500),
  latitude: decimalInput(3, 6, "Latitude", true)
    .refine(
      (value) => new Prisma.Decimal(value).gte(-90),
      "Latitude must be at least -90",
    )
    .refine(
      (value) => new Prisma.Decimal(value).lte(90),
      "Latitude must be at most 90",
    )
    .nullable()
    .optional(),
  longitude: decimalInput(3, 6, "Longitude", true)
    .refine(
      (value) => new Prisma.Decimal(value).gte(-180),
      "Longitude must be at least -180",
    )
    .refine(
      (value) => new Prisma.Decimal(value).lte(180),
      "Longitude must be at most 180",
    )
    .nullable()
    .optional(),
  bedrooms: z.number().int().min(0).max(100).nullable().optional(),
  bathrooms: z.number().int().min(0).max(100).nullable().optional(),
  areaSqm: decimalInput(12, 2, "Area").nullable().optional(),
  floor: z.number().int().min(-20).max(300).nullable().optional(),
  totalFloors: z.number().int().min(1).max(300).nullable().optional(),
  parkingSpaces: z.number().int().min(0).max(1_000).nullable().optional(),
  yearBuilt: z
    .number()
    .int()
    .min(1800)
    .max(currentYear + 1)
    .nullable()
    .optional(),
  furnished: z.boolean().optional(),
  notes: nullableTrimmedString(20_000),
};

export const createPropertySchema = z.object(mutablePropertyFields).strict();

export const updatePropertySchema = z
  .object(mutablePropertyFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one property field is required",
  });

export const propertyIdParamsSchema = z
  .object({
    propertyId: z.uuid(),
  })
  .strict();

const optionalQueryNumber = (schema: z.ZodType<number>) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  );

const optionalQueryDecimal = (label: string) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    decimalInput(16, 2, label).optional(),
  );

export const listPropertiesQuerySchema = z
  .object({
    page: optionalQueryNumber(z.coerce.number().int().min(1)).default(1),
    pageSize: optionalQueryNumber(
      z.coerce.number().int().min(1).max(100),
    ).default(20),
    search: z.string().trim().max(200).optional(),
    status: z.enum(PropertyStatus).optional(),
    propertyType: z.enum(PropertyType).optional(),
    purpose: z.enum(PropertyPurpose).optional(),
    currency: z.enum(Currency).optional(),
    city: z.string().trim().max(120).optional(),
    district: z.string().trim().max(120).optional(),
    assignedAgentId: z.uuid().optional(),
    minPrice: optionalQueryDecimal("Minimum price"),
    maxPrice: optionalQueryDecimal("Maximum price"),
    minBedrooms: optionalQueryNumber(z.coerce.number().int().min(0).max(100)),
    maxBedrooms: optionalQueryNumber(z.coerce.number().int().min(0).max(100)),
    minAreaSqm: optionalQueryDecimal("Minimum area"),
    maxAreaSqm: optionalQueryDecimal("Maximum area"),
    sortBy: z
      .enum(["createdAt", "updatedAt", "price", "title", "referenceCode"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .superRefine((query, context) => {
    addRangeIssue(context, "minPrice", query.minPrice, query.maxPrice);
    addRangeIssue(context, "minBedrooms", query.minBedrooms, query.maxBedrooms);
    addRangeIssue(context, "minAreaSqm", query.minAreaSqm, query.maxAreaSqm);
  });

const addRangeIssue = (
  context: z.RefinementCtx,
  path: string,
  minimum: string | number | undefined,
  maximum: string | number | undefined,
) => {
  if (
    minimum !== undefined &&
    maximum !== undefined &&
    new Prisma.Decimal(minimum).gt(maximum)
  ) {
    context.addIssue({
      code: "custom",
      path: [path],
      message: "Minimum cannot exceed maximum",
    });
  }
};

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;
export type PropertyIdParams = z.infer<typeof propertyIdParamsSchema>;
