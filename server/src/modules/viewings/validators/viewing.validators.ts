import { ViewingStatus } from "@prisma/client";
import { z } from "zod";

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const date = z.iso.datetime({ offset: true });
const timezone = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");
const viewingFields = {
  propertyId: z.uuid(),
  clientId: z.uuid(),
  dealId: z.uuid().nullable().optional(),
  // If omitted, the API assigns the authenticated application user.
  // The frontend Supabase auth UUID is intentionally not used here because
  // application users have their own Prisma UUIDs.
  assignedAgentId: z.uuid().optional(),
  title: z.string().trim().min(2).max(180),
  description: nullableText(20_000),
  startAt: date,
  endAt: date,
  timezone,
  location: nullableText(500),
  outcome: nullableText(2000),
  cancellationReason: nullableText(1000),
  feedback: nullableText(20_000),
};
const validateState = (
  value: {
    status?: ViewingStatus;
    startAt?: string;
    endAt?: string;
    outcome?: string | null;
    cancellationReason?: string | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (
    value.startAt &&
    value.endAt &&
    new Date(value.startAt) >= new Date(value.endAt)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["startAt"],
      message: "startAt must be before endAt",
    });
  }
  if (value.status === ViewingStatus.COMPLETED && !value.outcome?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["outcome"],
      message: "Outcome is required for completed viewings",
    });
  }
  if (
    value.status === ViewingStatus.CANCELLED &&
    !value.cancellationReason?.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["cancellationReason"],
      message: "Cancellation reason is required",
    });
  }
};
export const createViewingSchema = z
  .object({
    ...viewingFields,
    status: z.literal(ViewingStatus.SCHEDULED).optional(),
  })
  .strict()
  .superRefine(validateState);
export const updateViewingSchema = z
  .object({ ...viewingFields, status: z.enum(ViewingStatus).optional() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0)
  .superRefine((value, ctx) => {
    if (
      value.startAt &&
      value.endAt &&
      new Date(value.startAt) >= new Date(value.endAt)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["startAt"],
        message: "startAt must be before endAt",
      });
    }
  });
export const viewingParamsSchema = z.object({ viewingId: z.uuid() }).strict();

const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : value),
    schema.optional(),
  );
const optionalDate = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  date.optional(),
);
export const listViewingsQuerySchema = z
  .object({
    page: optionalNumber(z.coerce.number().int().min(1)).default(1),
    pageSize: optionalNumber(z.coerce.number().int().min(1).max(100)).default(
      20,
    ),
    search: z.string().trim().max(200).optional(),
    status: z.enum(ViewingStatus).optional(),
    assignedAgentId: z.uuid().optional(),
    clientId: z.uuid().optional(),
    propertyId: z.uuid().optional(),
    dealId: z.uuid().optional(),
    startFrom: optionalDate,
    startTo: optionalDate,
    sortBy: z
      .enum(["startAt", "createdAt", "updatedAt", "title"])
      .default("startAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.startFrom &&
      value.startTo &&
      new Date(value.startFrom) > new Date(value.startTo)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["startFrom"],
        message: "Start range is invalid",
      });
    }
  });
export const calendarQuerySchema = z
  .object({ startAt: date, endAt: date })
  .strict()
  .refine((value) => new Date(value.startAt) < new Date(value.endAt), {
    path: ["startAt"],
    message: "Calendar range is invalid",
  });

export type CreateViewingInput = z.infer<typeof createViewingSchema>;
export type UpdateViewingInput = z.infer<typeof updateViewingSchema>;
export type ListViewingsQuery = z.infer<typeof listViewingsQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
