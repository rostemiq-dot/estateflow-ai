import { PropertyMediaType } from "@prisma/client";
import { z } from "zod";

const pathSchema = z.string().trim().min(1).max(1000);
const mimeTypeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(150)
  .regex(/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/);

const mediaFields = {
  mediaType: z.enum(PropertyMediaType),
  storagePath: pathSchema,
  thumbnailPath: pathSchema.nullable().optional(),
  fileName: z.string().trim().min(1).max(255),
  mimeType: mimeTypeSchema,
  fileSize: z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  duration: z.number().int().nonnegative().nullable().optional(),
  displayOrder: z.number().int().nonnegative().max(1_000_000),
  isCover: z.boolean(),
  metadata: z.record(z.string(), z.json()).nullable().optional(),
};

const validateMediaMimeType = (
  value: { mediaType?: PropertyMediaType; mimeType?: string },
  context: z.RefinementCtx,
) => {
  if (!value.mediaType || !value.mimeType) return;
  const allowed: Record<PropertyMediaType, RegExp> = {
    IMAGE: /^image\//,
    VIDEO: /^video\//,
    PDF: /^application\/pdf$/,
    FLOOR_PLAN: /^(image\/|application\/pdf$)/,
    TOUR_360: /^(image\/|video\/|application\/json$)/,
  };
  if (!allowed[value.mediaType].test(value.mimeType)) {
    context.addIssue({
      code: "custom",
      path: ["mimeType"],
      message: `Mime type is not valid for ${value.mediaType}`,
    });
  }
};

export const createMediaSchema = z
  .object({
    ...mediaFields,
    displayOrder: mediaFields.displayOrder.default(0),
    isCover: mediaFields.isCover.default(false),
  })
  .strict()
  .superRefine(validateMediaMimeType);

export const updateMediaSchema = z
  .object(mediaFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one media field is required",
  })
  .refine(
    (value) =>
      (value.mediaType === undefined) === (value.mimeType === undefined),
    {
      message: "mediaType and mimeType must be updated together",
      path: ["mimeType"],
    },
  )
  .superRefine(validateMediaMimeType);

export const propertyMediaParamsSchema = z
  .object({ propertyId: z.uuid(), mediaId: z.uuid().optional() })
  .strict();

const catalogFields = {
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
};

export const createAmenitySchema = z
  .object({
    ...catalogFields,
    icon: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .strict();
export const updateAmenitySchema = createAmenitySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const createTagSchema = z
  .object({
    ...catalogFields,
    color: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^#[0-9A-F]{6}$/)
      .nullable()
      .optional(),
  })
  .strict();
export const updateTagSchema = createTagSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const catalogParamsSchema = z.object({ id: z.uuid() }).strict();

export type CreateMediaInput = z.infer<typeof createMediaSchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type CreateAmenityInput = z.infer<typeof createAmenitySchema>;
export type UpdateAmenityInput = z.infer<typeof updateAmenitySchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
