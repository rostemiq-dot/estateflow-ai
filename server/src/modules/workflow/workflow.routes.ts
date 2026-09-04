import { Router, type RequestHandler } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createAuthenticate } from "../auth/middleware/authenticate.js";
import { authorize } from "../auth/middleware/authorize.js";
import { AppError } from "../../errors/app-error.js";

const all = authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT);
const managers = authorize(UserRole.OWNER, UserRole.ADMIN);
const auth = (req: Parameters<RequestHandler>[0]) => {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user;
};
const uuid = (value: unknown) => {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError("Invalid identifier", 400);
  }
  return value;
};
const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const positive = (value: unknown, field: string) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new AppError(`${field} must be a valid non-negative number`, 400);
  return n;
};
const date = (value: unknown, field: string) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) throw new AppError(`${field} must be a valid date`, 400);
  return value;
};

export const workflowRouter = Router();
workflowRouter.use(createAuthenticate());

workflowRouter.get("/offers", async (req, res, next) => {
  try {
    const user = auth(req);
    const dealId = req.query.dealId ? uuid(req.query.dealId) : null;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      select id, deal_id as "dealId", parent_offer_id as "parentOfferId", amount::text as amount,
             currency, offer_date as "offerDate", expiration_date as "expirationDate", conditions, notes,
             status::text as status, created_by_id as "createdById", created_at as "createdAt", updated_at as "updatedAt"
      from public.offers
      where agency_id = ${user.agencyId}::uuid and deleted_at is null
        and (${dealId}::uuid is null or deal_id = ${dealId}::uuid)
      order by offer_date desc, created_at desc
    `;
    res.json({ data: rows });
  } catch (error) { next(error); }
});

workflowRouter.post("/offers", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const dealId = uuid(req.body.dealId);
    const amount = positive(req.body.amount, "amount");
    const currency = text(req.body.currency);
    if (!['USD', 'IQD'].includes(currency)) throw new AppError("Currency must be USD or IQD", 400);
    const parentOfferId = req.body.parentOfferId ? uuid(req.body.parentOfferId) : null;
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      insert into public.offers (agency_id, deal_id, parent_offer_id, amount, currency, offer_date, expiration_date, conditions, notes, status, created_by_id)
      select ${user.agencyId}::uuid, d.id, ${parentOfferId}::uuid, ${amount}, ${currency},
             coalesce(${req.body.offerDate ?? null}::timestamptz, now()), ${req.body.expirationDate ?? null}::timestamptz,
             ${text(req.body.conditions)}, ${text(req.body.notes)}, 'DRAFT'::"OfferStatus", ${user.id}::uuid
      from public.deals d where d.id=${dealId}::uuid and d.agency_id=${user.agencyId}::uuid and d.deleted_at is null
      returning id, deal_id as "dealId", amount::text as amount, currency, offer_date as "offerDate", expiration_date as "expirationDate", conditions, notes, status::text as status, created_at as "createdAt"
    `;
    if (!row[0]) throw new AppError("Deal not found", 404);
    res.status(201).json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.patch("/offers/:offerId", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const offerId = uuid(req.params.offerId);
    const status = req.body.status ? text(req.body.status) : null;
    if (status && !['DRAFT','SENT','COUNTERED','ACCEPTED','REJECTED','EXPIRED'].includes(status)) throw new AppError("Invalid offer status", 400);
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      update public.offers set
        amount=coalesce(${req.body.amount === undefined ? null : positive(req.body.amount, "amount")}, amount),
        expiration_date=coalesce(${req.body.expirationDate === undefined ? null : req.body.expirationDate}::timestamptz, expiration_date),
        conditions=coalesce(${req.body.conditions === undefined ? null : text(req.body.conditions)}, conditions),
        notes=coalesce(${req.body.notes === undefined ? null : text(req.body.notes)}, notes),
        status=coalesce(${status}::"OfferStatus", status), updated_at=now()
      where id=${offerId}::uuid and agency_id=${user.agencyId}::uuid and deleted_at is null
      returning id, deal_id as "dealId", amount::text as amount, currency, offer_date as "offerDate", expiration_date as "expirationDate", conditions, notes, status::text as status, updated_at as "updatedAt"
    `;
    if (!row[0]) throw new AppError("Offer not found", 404);
    res.json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.delete("/offers/:offerId", managers, async (req, res, next) => {
  try {
    const user = auth(req);
    const offerId = uuid(req.params.offerId);
    const result = await prisma.$executeRaw`update public.offers set deleted_at=now(), updated_at=now() where id=${offerId}::uuid and agency_id=${user.agencyId}::uuid and deleted_at is null`;
    if (result !== 1) throw new AppError("Offer not found", 404);
    res.status(204).send();
  } catch (error) { next(error); }
});

workflowRouter.get("/contracts", async (req, res, next) => {
  try {
    const user = auth(req);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      select id, deal_id as "dealId", offer_id as "offerId", client_id as "clientId", property_id as "propertyId",
             contract_number as "contractNumber", contract_type as "contractType", status::text as status,
             agreed_amount::text as "agreedAmount", currency, deposit_amount::text as "depositAmount",
             commission_amount::text as "commissionAmount", start_date as "startDate", end_date as "endDate",
             terms, clauses, notes, responsible_agent_id as "responsibleAgentId", signed_snapshot as "signedSnapshot",
             signed_at as "signedAt", created_by_id as "createdById", created_at as "createdAt", updated_at as "updatedAt"
      from public.contracts where agency_id=${user.agencyId}::uuid and deleted_at is null
      order by created_at desc
    `;
    res.json({ data: rows });
  } catch (error) { next(error); }
});

workflowRouter.post("/contracts", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const dealId = uuid(req.body.dealId);
    const offerId = uuid(req.body.offerId);
    const clientId = uuid(req.body.clientId);
    const propertyId = uuid(req.body.propertyId);
    const responsibleAgentId = uuid(req.body.responsibleAgentId);
    const contractNumber = text(req.body.contractNumber);
    if (!contractNumber) throw new AppError("Contract number is required", 400);
    const contractType = text(req.body.contractType);
    if (!['SALE','RENTAL'].includes(contractType)) throw new AppError("Contract type must be SALE or RENTAL", 400);
    const currency = text(req.body.currency);
    if (!['USD','IQD'].includes(currency)) throw new AppError("Currency must be USD or IQD", 400);
    const startDate = date(req.body.startDate, "startDate");
    const endDate = req.body.endDate ? date(req.body.endDate, "endDate") : null;
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      insert into public.contracts (agency_id, deal_id, offer_id, client_id, property_id, contract_number, contract_type, agreed_amount, currency, deposit_amount, commission_amount, start_date, end_date, terms, clauses, notes, responsible_agent_id, created_by_id)
      select ${user.agencyId}::uuid, d.id, o.id, ${clientId}::uuid, ${propertyId}::uuid, ${contractNumber}, ${contractType}, o.amount, ${currency},
             ${positive(req.body.depositAmount ?? 0, "depositAmount")}, ${positive(req.body.commissionAmount ?? 0, "commissionAmount")}, ${startDate}::date, ${endDate}::date,
             ${text(req.body.terms)}, ${JSON.stringify(Array.isArray(req.body.clauses) ? req.body.clauses : [])}::jsonb, ${text(req.body.notes)}, ${responsibleAgentId}::uuid, ${user.id}::uuid
      from public.deals d join public.offers o on o.id=${offerId}::uuid and o.deal_id=d.id and o.agency_id=d.agency_id
      where d.id=${dealId}::uuid and d.agency_id=${user.agencyId}::uuid and d.deleted_at is null and o.status='ACCEPTED'::"OfferStatus"
      returning id, deal_id as "dealId", offer_id as "offerId", contract_number as "contractNumber", contract_type as "contractType", status::text as status, agreed_amount::text as "agreedAmount", currency, start_date as "startDate", end_date as "endDate", terms, clauses, notes, responsible_agent_id as "responsibleAgentId", created_at as "createdAt"
    `;
    if (!row[0]) throw new AppError("An accepted offer for the selected deal was not found", 409);
    await prisma.$executeRaw`
      insert into public.contract_versions (contract_id, version, changed_fields, summary, snapshot, created_by_id)
      values (${row[0].id}::uuid, 1, '[]'::jsonb, 'Initial contract version', jsonb_build_object('contractNumber', ${contractNumber}, 'agreedAmount', ${String(req.body.agreedAmount ?? '')}, 'currency', ${currency}, 'terms', ${text(req.body.terms)}), ${user.id}::uuid)
    `;
    res.status(201).json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.patch("/contracts/:contractId/status", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const contractId = uuid(req.params.contractId);
    const status = text(req.body.status);
    if (!['DRAFT','UNDER_REVIEW','READY_TO_SIGN','SIGNED','CANCELLED'].includes(status)) throw new AppError("Invalid contract status", 400);
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      update public.contracts set status=${status}::"ContractStatus", signed_at=case when ${status}='SIGNED' then now() else signed_at end,
        signed_snapshot=case when ${status}='SIGNED' then jsonb_build_object('contractNumber',contract_number,'agreedAmount',agreed_amount::text,'currency',currency,'terms',terms,'clauses',clauses) else signed_snapshot end,
        updated_at=now()
      where id=${contractId}::uuid and agency_id=${user.agencyId}::uuid and deleted_at is null
      returning id, contract_number as "contractNumber", status::text as status, signed_at as "signedAt", updated_at as "updatedAt"
    `;
    if (!row[0]) throw new AppError("Contract not found", 404);
    res.json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.get("/commissions", async (req, res, next) => {
  try {
    const user = auth(req);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      select id, deal_id as "dealId", contract_id as "contractId", mode, rate::text as rate, fixed_amount::text as "fixedAmount",
             agent_share_rate::text as "agentShareRate", calculated_amount::text as "calculatedAmount", confirmed, confirmed_at as "confirmedAt"
      from public.commissions where agency_id=${user.agencyId}::uuid order by created_at desc
    `;
    res.json({ data: rows });
  } catch (error) { next(error); }
});

workflowRouter.put("/commissions/:dealId", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const dealId = uuid(req.params.dealId);
    const mode = text(req.body.mode);
    if (!['PERCENTAGE','FIXED'].includes(mode)) throw new AppError("Commission mode must be PERCENTAGE or FIXED", 400);
    const rate = positive(req.body.rate ?? 0, "rate");
    const fixedAmount = positive(req.body.fixedAmount ?? 0, "fixedAmount");
    const agentShareRate = positive(req.body.agentShareRate ?? 50, "agentShareRate");
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      insert into public.commissions (agency_id, deal_id, contract_id, mode, rate, fixed_amount, agent_share_rate, calculated_amount, confirmed, created_by_id)
      select ${user.agencyId}::uuid, d.id, c.id, ${mode}, ${rate}, ${fixedAmount}, ${agentShareRate},
        case when ${mode}='PERCENTAGE' then coalesce(d.agreed_amount,d.offer_amount,d.asking_price,0)*${rate}/100 else ${fixedAmount} end,
        false, ${user.id}::uuid
      from public.deals d left join public.contracts c on c.deal_id=d.id and c.deleted_at is null
      where d.id=${dealId}::uuid and d.agency_id=${user.agencyId}::uuid and d.deleted_at is null
      on conflict (deal_id) do update set mode=excluded.mode, contract_id=excluded.contract_id, rate=excluded.rate, fixed_amount=excluded.fixed_amount, agent_share_rate=excluded.agent_share_rate, calculated_amount=excluded.calculated_amount, updated_at=now()
      returning id, deal_id as "dealId", contract_id as "contractId", mode, rate::text as rate, fixed_amount::text as "fixedAmount", agent_share_rate::text as "agentShareRate", calculated_amount::text as "calculatedAmount", confirmed
    `;
    if (!row[0]) throw new AppError("Deal not found", 404);
    res.json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.get("/payments", async (req, res, next) => {
  try {
    const user = auth(req);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      select s.id, s.deal_id as "dealId", s.contract_id as "contractId", s.label, s.amount::text as amount, s.currency,
             s.due_date as "dueDate", s.status::text as status, s.notes,
             coalesce(json_agg(json_build_object('id',r.id,'amount',r.amount::text,'paidDate',r.paid_date,'method',r.method,'reference',r.reference,'notes',r.notes) order by r.paid_date desc) filter (where r.id is not null),'[]'::json) as payments
      from public.payment_schedules s left join public.payment_records r on r.schedule_id=s.id
      where s.agency_id=${user.agencyId}::uuid group by s.id order by s.due_date asc
    `;
    res.json({ data: rows });
  } catch (error) { next(error); }
});

workflowRouter.post("/payments/schedules", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const dealId = uuid(req.body.dealId);
    const contractId = req.body.contractId ? uuid(req.body.contractId) : null;
    const amount = positive(req.body.amount, "amount");
    const currency = text(req.body.currency);
    if (!['USD','IQD'].includes(currency)) throw new AppError("Currency must be USD or IQD", 400);
    const dueDate = date(req.body.dueDate, "dueDate");
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      insert into public.payment_schedules (agency_id, deal_id, contract_id, label, amount, currency, due_date, notes, created_by_id)
      select ${user.agencyId}::uuid, d.id, ${contractId}::uuid, ${text(req.body.label, 'Payment')}, ${amount}, ${currency}, ${dueDate}::date, ${text(req.body.notes)}, ${user.id}::uuid
      from public.deals d where d.id=${dealId}::uuid and d.agency_id=${user.agencyId}::uuid and d.deleted_at is null
      returning id, deal_id as "dealId", contract_id as "contractId", label, amount::text as amount, currency, due_date as "dueDate", status::text as status, notes, created_at as "createdAt"
    `;
    if (!row[0]) throw new AppError("Deal not found", 404);
    res.status(201).json({ data: row[0] });
  } catch (error) { next(error); }
});

workflowRouter.post("/payments/:scheduleId/records", all, async (req, res, next) => {
  try {
    const user = auth(req);
    const scheduleId = uuid(req.params.scheduleId);
    const amount = positive(req.body.amount, "amount");
    if (amount <= 0) throw new AppError("Payment amount must be greater than zero", 400);
    const method = text(req.body.method);
    if (!['CASH','BANK_TRANSFER','CARD','CHEQUE','OTHER'].includes(method)) throw new AppError("Invalid payment method", 400);
    const row = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      insert into public.payment_records (agency_id, schedule_id, amount, paid_date, method, reference, notes, created_by_id)
      select ${user.agencyId}::uuid, s.id, ${amount}, coalesce(${req.body.paidDate ?? null}::timestamptz, now()), ${method}::"PaymentMethod", ${text(req.body.reference)}, ${text(req.body.notes)}, ${user.id}::uuid
      from public.payment_schedules s where s.id=${scheduleId}::uuid and s.agency_id=${user.agencyId}::uuid
      returning id, schedule_id as "scheduleId", amount::text as amount, paid_date as "paidDate", method::text as method, reference, notes, created_at as "createdAt"
    `;
    if (!row[0]) throw new AppError("Payment schedule not found", 404);
    await prisma.$executeRaw`
      update public.payment_schedules s set status=case
        when coalesce((select sum(r.amount) from public.payment_records r where r.schedule_id=s.id),0) >= s.amount then 'PAID'::"FinancialStatus"
        when coalesce((select sum(r.amount) from public.payment_records r where r.schedule_id=s.id),0) > 0 then 'PARTIALLY_PAID'::"FinancialStatus"
        else 'PENDING'::"FinancialStatus" end, updated_at=now() where s.id=${scheduleId}::uuid
    `;
    res.status(201).json({ data: row[0] });
  } catch (error) { next(error); }
});
