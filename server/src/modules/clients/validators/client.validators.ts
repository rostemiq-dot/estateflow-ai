import {
  ClientActivityType,
  ClientLeadSource,
  ClientLeadStatus,
  ClientPriority,
  ClientRoleType,
  Currency,
  Prisma,
  PropertyType,
} from "@prisma/client";
import { z } from "zod";

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(z.string().regex(/^(?:\+[1-9]\d{6,14}|0\d{7,14}|[1-9]\d{6,14})$/));
const nullableString = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const nullablePhone = phone.nullable().optional();
const nullableDate = z.iso.datetime({ offset: true }).nullable().optional();

const clientFields = {
  assignedAgentId: z.uuid().nullable().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email().max(320))
    .nullable()
    .optional(),
  phone,
  secondaryPhone: nullablePhone,
  whatsapp: nullablePhone,
  nationality: nullableString(100),
  preferredLanguage: nullableString(50),
  company: nullableString(160),
  leadStatus: z.enum(ClientLeadStatus).optional(),
  leadSource: z.enum(ClientLeadSource).nullable().optional(),
  priority: z.enum(ClientPriority).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: nullableString(20_000),
  nextFollowUpAt: nullableDate,
  lastContactAt: nullableDate,
};

export const createClientSchema = z.object(clientFields).strict();
export const updateClientSchema = z
  .object(clientFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one client field is required",
  });
export const clientIdParamsSchema = z.object({ clientId: z.uuid() }).strict();
export const clientChildParamsSchema = z
  .object({
    clientId: z.uuid(),
    preferenceId: z.uuid().optional(),
    tagId: z.uuid().optional(),
    role: z.enum(ClientRoleType).optional(),
  })
  .strict();
export const assignClientSchema = z
  .object({ assignedAgentId: z.uuid().nullable() })
  .strict();
export const addClientRoleSchema = z
  .object({ role: z.enum(ClientRoleType) })
  .strict();

const optionalQueryNumber = (schema: z.ZodType<number>) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  );

export const listClientsQuerySchema = z
  .object({
    page: optionalQueryNumber(z.coerce.number().int().min(1)).default(1),
    pageSize: optionalQueryNumber(
      z.coerce.number().int().min(1).max(100),
    ).default(20),
    search: z.string().trim().max(200).optional(),
    name: z.string().trim().max(201).optional(),
    phone: z.string().trim().max(30).optional(),
    email: z.string().trim().toLowerCase().max(320).optional(),
    role: z.enum(ClientRoleType).optional(),
    leadStatus: z.enum(ClientLeadStatus).optional(),
    leadSource: z.enum(ClientLeadSource).optional(),
    assignedAgentId: z.uuid().optional(),
    tagId: z.uuid().optional(),
    priority: z.enum(ClientPriority).optional(),
    sortBy: z
      .enum(["createdAt", "updatedAt", "fullName", "nextFollowUpAt", "rating"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

const decimal = (digits: number, scale: number) =>
  z
    .union([z.string(), z.number().finite()])
    .transform((value) => String(value).trim())
    .refine(
      (value) =>
        new RegExp(
          `^(?:0|[1-9]\\d{0,${digits - 1}})(?:\\.\\d{1,${scale}})?$`,
        ).test(value),
      `Must be a non-negative decimal with at most ${scale} decimal places`,
    );

const preferenceFields = {
  propertyType: z.enum(PropertyType),
  city: z.string().trim().min(2).max(120),
  district: nullableString(120),
  bedrooms: z.number().int().min(0).max(100).nullable().optional(),
  bathrooms: z.number().int().min(0).max(100).nullable().optional(),
  minArea: decimal(12, 2).nullable().optional(),
  maxArea: decimal(12, 2).nullable().optional(),
  minBudget: decimal(16, 2).nullable().optional(),
  maxBudget: decimal(16, 2).nullable().optional(),
  currency: z.enum(Currency),
};
const validateRanges = (
  value: {
    minArea?: string | null;
    maxArea?: string | null;
    minBudget?: string | null;
    maxBudget?: string | null;
  },
  context: z.RefinementCtx,
) => {
  for (const [minKey, maxKey] of [
    ["minArea", "maxArea"],
    ["minBudget", "maxBudget"],
  ] as const) {
    const min = value[minKey];
    const max = value[maxKey];
    if (min != null && max != null && new Prisma.Decimal(min).gt(max)) {
      context.addIssue({
        code: "custom",
        path: [minKey],
        message: "Minimum cannot exceed maximum",
      });
    }
  }
};
export const createPreferenceSchema = z
  .object(preferenceFields)
  .strict()
  .superRefine(validateRanges);
export const updatePreferenceSchema = z
  .object(preferenceFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0)
  .superRefine(validateRanges);

export const createActivitySchema = z
  .object({
    activityType: z.enum(ClientActivityType),
    description: z.string().trim().min(1).max(10_000),
    metadata: z.record(z.string(), z.json()).nullable().optional(),
  })
  .strict();

const tagFields = {
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  color: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^#[0-9A-F]{6}$/)
    .nullable()
    .optional(),
};
export const createClientTagSchema = z.object(tagFields).strict();
export const updateClientTagSchema = z
  .object(tagFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0);
export const tagIdParamsSchema = z.object({ tagId: z.uuid() }).strict();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
export type CreatePreferenceInput = z.infer<typeof createPreferenceSchema>;
export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CreateClientTagInput = z.infer<typeof createClientTagSchema>;
export type UpdateClientTagInput = z.infer<typeof updateClientTagSchema>;
