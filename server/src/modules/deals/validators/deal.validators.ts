import {
  CommissionType,
  Currency,
  DealStage,
  DealStatus,
  DealType,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

const money = z
  .union([z.string(), z.number().finite()])
  .transform((v) => String(v).trim())
  .refine((v) => /^(?:0|[1-9]\d{0,15})(?:\.\d{1,4})?$/.test(v), {
    message: "Must be a non-negative monetary value",
  });
const nullableMoney = money.nullable().optional();
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const nullableDate = z.iso.datetime({ offset: true }).nullable().optional();

const dealFields = {
  clientId: z.uuid(),
  propertyId: z.uuid(),
  assignedAgentId: z.uuid(),
  title: z.string().trim().min(2).max(180),
  dealType: z.enum(DealType),
  stage: z.enum(DealStage).optional(),
  status: z.enum(DealStatus).optional(),
  askingPrice: nullableMoney,
  offerAmount: nullableMoney,
  agreedAmount: nullableMoney,
  currency: z.enum(Currency),
  expectedCommission: nullableMoney,
  commissionType: z.enum(CommissionType).nullable().optional(),
  expectedCloseAt: nullableDate,
  closedAt: nullableDate,
  lostReason: nullableText(1000),
  description: nullableText(20_000),
};

const validateDealState = (
  value: {
    stage?: DealStage;
    status?: DealStatus;
    closedAt?: string | null;
    lostReason?: string | null;
    commissionType?: CommissionType | null;
    expectedCommission?: string | null;
  },
  ctx: z.RefinementCtx,
) => {
  const stage = value.stage ?? DealStage.NEW_LEAD;
  const status = value.status ?? DealStatus.OPEN;
  if ((stage === DealStage.WON) !== (status === DealStatus.WON)) {
    ctx.addIssue({
      code: "custom",
      path: ["status"],
      message: "WON stage and status must match",
    });
  }
  if ((stage === DealStage.LOST) !== (status === DealStatus.LOST)) {
    ctx.addIssue({
      code: "custom",
      path: ["status"],
      message: "LOST stage and status must match",
    });
  }
  if (
    (status === DealStatus.WON || status === DealStatus.LOST) &&
    !value.closedAt
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["closedAt"],
      message: "closedAt is required for closed deals",
    });
  }
  if (status === DealStatus.LOST && !value.lostReason?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["lostReason"],
      message: "lostReason is required for lost deals",
    });
  }
  if (
    value.commissionType === CommissionType.PERCENTAGE &&
    (value.expectedCommission == null ||
      new Prisma.Decimal(value.expectedCommission).gt(100))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["expectedCommission"],
      message: "Percentage commission must be between 0 and 100",
    });
  }
  if ((value.commissionType == null) !== (value.expectedCommission == null)) {
    ctx.addIssue({
      code: "custom",
      path: ["commissionType"],
      message: "Commission type and value must be provided together",
    });
  }
};

export const createDealSchema = z
  .object(dealFields)
  .strict()
  .superRefine(validateDealState);
export const updateDealSchema = z
  .object({
    title: dealFields.title.optional(),
    dealType: dealFields.dealType.optional(),
    status: z.enum([DealStatus.OPEN, DealStatus.CANCELLED]).optional(),
    askingPrice: nullableMoney,
    offerAmount: nullableMoney,
    agreedAmount: nullableMoney,
    currency: dealFields.currency.optional(),
    expectedCommission: nullableMoney,
    commissionType: dealFields.commissionType,
    expectedCloseAt: nullableDate,
    description: nullableText(20_000),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0)
  .refine(
    (v) =>
      Object.hasOwn(v, "commissionType") ===
      Object.hasOwn(v, "expectedCommission"),
    {
      path: ["commissionType"],
      message: "Commission type and value must be updated together",
    },
  )
  .superRefine(validateDealState);
export const assignmentSchema = z
  .object({ assignedAgentId: z.uuid() })
  .strict();
export const stageChangeSchema = z
  .object({
    stage: z.enum(DealStage),
    note: z.string().trim().max(2000).nullable().optional(),
    closedAt: nullableDate,
    lostReason: nullableText(1000),
  })
  .strict()
  .superRefine((v, ctx) => {
    const closed = v.stage === DealStage.WON || v.stage === DealStage.LOST;
    if (closed && !v.closedAt)
      ctx.addIssue({
        code: "custom",
        path: ["closedAt"],
        message: "closedAt is required",
      });
    if (v.stage === DealStage.LOST && !v.lostReason?.trim())
      ctx.addIssue({
        code: "custom",
        path: ["lostReason"],
        message: "lostReason is required",
      });
    if (!closed && (v.closedAt != null || v.lostReason != null))
      ctx.addIssue({
        code: "custom",
        path: ["stage"],
        message: "Closing fields require WON or LOST stage",
      });
  });
export const createNoteSchema = z
  .object({ body: z.string().trim().min(1).max(10_000) })
  .strict();
export const updateNoteSchema = createNoteSchema;
export const dealParamsSchema = z
  .object({ dealId: z.uuid(), noteId: z.uuid().optional() })
  .strict();

const qnum = (schema: z.ZodType<number>) =>
  z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    schema.optional(),
  );
const qdate = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.iso.datetime({ offset: true }).optional(),
);
const qmoney = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  money.optional(),
);
export const listDealsQuerySchema = z
  .object({
    page: qnum(z.coerce.number().int().min(1)).default(1),
    pageSize: qnum(z.coerce.number().int().min(1).max(100)).default(20),
    search: z.string().trim().max(200).optional(),
    stage: z.enum(DealStage).optional(),
    status: z.enum(DealStatus).optional(),
    dealType: z.enum(DealType).optional(),
    assignedAgentId: z.uuid().optional(),
    clientId: z.uuid().optional(),
    propertyId: z.uuid().optional(),
    currency: z.enum(Currency).optional(),
    expectedCloseFrom: qdate,
    expectedCloseTo: qdate,
    createdFrom: qdate,
    createdTo: qdate,
    minAmount: qmoney,
    maxAmount: qmoney,
    sortBy: z
      .enum([
        "updatedAt",
        "createdAt",
        "expectedCloseAt",
        "title",
        "agreedAmount",
      ])
      .default("updatedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const [a, b] of [
      ["expectedCloseFrom", "expectedCloseTo"],
      ["createdFrom", "createdTo"],
    ] as const)
      if (v[a] && v[b] && new Date(v[a]) > new Date(v[b]))
        ctx.addIssue({
          code: "custom",
          path: [a],
          message: "From date cannot exceed to date",
        });
    if (
      v.minAmount &&
      v.maxAmount &&
      new Prisma.Decimal(v.minAmount).gt(v.maxAmount)
    )
      ctx.addIssue({
        code: "custom",
        path: ["minAmount"],
        message: "Minimum cannot exceed maximum",
      });
  });

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type StageChangeInput = z.infer<typeof stageChangeSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;
