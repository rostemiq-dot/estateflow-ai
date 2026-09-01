import { Currency, DealStage, DealStatus, DealType, Prisma } from "@prisma/client";
import { z } from "zod";

const nullableMoney = z.union([z.string(), z.number().finite()]).transform((value) => String(value).trim()).nullable().optional();
const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();
const nullableDate = z.iso.datetime({ offset: true }).nullable().optional();

const dealFields = {
  clientId: z.uuid().optional(),
  propertyId: z.uuid().nullable().optional(),
  assignedAgentId: z.uuid().nullable().optional(),
  referenceCode: z.string().trim().min(2).max(50),
  dealType: z.enum(DealType),
  stage: z.enum(DealStage).optional(),
  status: z.enum(DealStatus).optional(),
  currency: z.enum(Currency),
  expectedCommission: nullableMoney,
  commissionType: z.enum(["FIXED", "PERCENTAGE"]),
  expectedCloseAt: nullableDate,
  description: nullableText(20_000),
};

const validateDealState = () => undefined;

export const updateDealSchema = z
  .object(dealFields)
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0)
  .refine(
    (v) =>
      Object.prototype.hasOwnProperty.call(v, "commissionType") ===
      Object.prototype.hasOwnProperty.call(v, "expectedCommission"),
    {
      path: ["commissionType"],
      message: "Commission type and value must be updated together",
    },
  )
  .superRefine(validateDealState);
