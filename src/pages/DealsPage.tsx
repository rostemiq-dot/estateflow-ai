import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Copy,
  Edit3,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import {
  getActivitiesForClient,
  loadActivities,
} from "../features/activities/activity-storage";
import { loadClients } from "../features/clients/client-storage";
import {
  COMMISSION_MODES,
  DEAL_STAGES,
  OFFER_STATUSES,
  PAYMENT_METHODS,
  type Deal,
  type DealDraft,
  type DealStage,
  type Offer,
  type OfferStatus,
  type PaymentMethod,
  type PaymentSchedule,
} from "../features/deals/deal-data";
import {
  createDeal,
  loadDeals,
  saveDeals,
} from "../features/deals/deal-storage";
import {
  acceptOffer,
  addPaymentRecord,
  calculateCommission,
  canTransitionDeal,
  createCounterOffer,
  derivePaymentStatus,
  formatMoney,
  getAcceptedOffer,
  getClosedPropertyStatus,
  getCommissionBase,
  getPaidAmount,
  getRemainingAmount,
  isClosedStage,
  toMinorUnits,
} from "../features/deals/deal-utils";
import {
  loadProperties,
  saveProperties,
} from "../features/properties/property-storage";
import { loadViewings } from "../features/viewings/viewing-storage";
import { createWhatsAppUrl } from "../lib/whatsapp";

type SortOption = "updated" | "value-high" | "value-low" | "action";

const inputClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";
const textareaClass = `${inputClass} min-h-24 py-3`;
const stageStyles: Record<DealStage, string> = {
  Lead: "bg-sky-50 text-sky-700",
  Viewing: "bg-violet-50 text-violet-700",
  Negotiation: "bg-amber-50 text-amber-800",
  "Offer Made": "bg-orange-50 text-orange-700",
  Contract: "bg-indigo-50 text-indigo-700",
  "Closed Won": "bg-emerald-50 text-emerald-700",
  "Closed Lost": "bg-rose-50 text-rose-700",
};

function localDateTime(value: string) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function DealForm({
  deal,
  clients,
  properties,
  onClose,
  onSave,
}: {
  deal?: Deal;
  clients: ReturnType<typeof loadClients>;
  properties: ReturnType<typeof loadProperties>;
  onClose: () => void;
  onSave: (draft: DealDraft) => void;
}) {
  const firstProperty =
    properties.find(
      (property) => property.status !== "Sold" && property.status !== "Rented",
    ) ?? properties[0];
  const initialProperty =
    properties.find((property) => property.id === deal?.propertyId) ??
    firstProperty;
  const initialClient =
    clients.find((client) => client.id === deal?.clientId) ?? clients[0];
  const [clientId, setClientId] = useState(
    deal?.clientId ?? initialClient?.id ?? "",
  );
  const [propertyId, setPropertyId] = useState(
    deal?.propertyId ?? initialProperty?.id ?? "",
  );
  const [title, setTitle] = useState(deal?.title ?? "");
  const [type, setType] = useState<Deal["type"]>(
    deal?.type ?? (initialProperty?.purpose === "Rent" ? "Rental" : "Sale"),
  );
  const [stage, setStage] = useState<DealStage>(deal?.stage ?? "Lead");
  const [value, setValue] = useState(
    String(
      deal ? deal.expectedValueMinor / 100 : (initialProperty?.price ?? 0),
    ),
  );
  const [currency, setCurrency] = useState<Deal["currency"]>(
    deal?.currency ?? initialProperty?.currency ?? "USD",
  );
  const [probability, setProbability] = useState(
    String(deal?.probability ?? 25),
  );
  const [agent, setAgent] = useState(
    deal?.assignedAgent ?? initialClient?.assignedAgent ?? "Mohammed",
  );
  const [nextAction, setNextAction] = useState(deal?.nextAction ?? "");
  const [nextActionAt, setNextActionAt] = useState(deal?.nextActionAt ?? "");
  const [closeDate, setCloseDate] = useState(deal?.expectedCloseDate ?? "");
  const [notes, setNotes] = useState(deal?.notes ?? "");
  const [error, setError] = useState("");

  function selectProperty(nextId: string) {
    const property = properties.find((candidate) => candidate.id === nextId);
    setPropertyId(nextId);
    if (!property) return;
    setType(property.purpose === "Rent" ? "Rental" : "Sale");
    setCurrency(property.currency);
    setValue(String(property.price));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!clientId || !propertyId || !title.trim()) {
      setError("Title, client, and property are required.");
      return;
    }
    onSave({
      title: title.trim(),
      clientId,
      propertyId,
      type,
      stage,
      expectedValueMinor: toMinorUnits(Number(value)),
      currency,
      probability: Math.min(100, Math.max(0, Number(probability))),
      assignedAgent: agent.trim(),
      nextAction: nextAction.trim(),
      nextActionAt,
      expectedCloseDate: closeDate,
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="mx-auto my-6 max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-700">DEAL RECORD</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {deal ? "Edit deal" : "Create a deal"}
            </h2>
          </div>
          <button
            aria-label="Close"
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="mx-auto" size={20} />
          </button>
        </div>
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <FormField label="Deal title">
            <input
              className={inputClass}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Client · property"
            />
          </FormField>
          <FormField label="Client">
            <select
              className={inputClass}
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} · {client.stage}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Property">
            <select
              className={inputClass}
              value={propertyId}
              onChange={(event) => selectProperty(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title} · {property.status}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Deal type">
            <select
              className={inputClass}
              value={type}
              onChange={(event) => setType(event.target.value as Deal["type"])}
            >
              <option>Sale</option>
              <option>Rental</option>
            </select>
          </FormField>
          <FormField label="Stage">
            <select
              className={inputClass}
              value={stage}
              onChange={(event) => setStage(event.target.value as DealStage)}
            >
              {DEAL_STAGES.filter(
                (item) => !isClosedStage(item) || item === deal?.stage,
              ).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Expected value">
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <select
                className={`${inputClass} w-28`}
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value as Deal["currency"])
                }
              >
                <option>USD</option>
                <option>IQD</option>
              </select>
            </div>
          </FormField>
          <FormField label="Probability (%)">
            <input
              type="number"
              min="0"
              max="100"
              className={inputClass}
              value={probability}
              onChange={(event) => setProbability(event.target.value)}
            />
          </FormField>
          <FormField label="Assigned agent">
            <input
              className={inputClass}
              value={agent}
              onChange={(event) => setAgent(event.target.value)}
            />
          </FormField>
          <FormField label="Next action">
            <input
              className={inputClass}
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
            />
          </FormField>
          <FormField label="Next action date">
            <input
              type="datetime-local"
              className={inputClass}
              value={nextActionAt}
              onChange={(event) => setNextActionAt(event.target.value)}
            />
          </FormField>
          <FormField label="Expected close date">
            <input
              type="date"
              className={inputClass}
              value={closeDate}
              onChange={(event) => setCloseDate(event.target.value)}
            />
          </FormField>
          <div />
          <div className="sm:col-span-2">
            <FormField label="Notes">
              <textarea
                className={textareaClass}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </FormField>
          </div>
        </div>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-12 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            Save deal
          </button>
        </div>
      </form>
    </div>
  );
}

function OfferPanel({
  deal,
  onChange,
}: {
  deal: Deal;
  onChange: (deal: Deal) => void;
}) {
  const [amount, setAmount] = useState("");
  const [expiration, setExpiration] = useState("");
  const [conditions, setConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [countering, setCountering] = useState<string | null>(null);

  function addOffer(event: FormEvent) {
    event.preventDefault();
    const amountMinor = toMinorUnits(Number(amount));
    if (amountMinor <= 0) return;
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    let offers = deal.offers;
    if (countering) {
      const source = offers.find((offer) => offer.id === countering);
      if (!source) return;
      const result = createCounterOffer(source, amountMinor, now);
      offers = offers.map((offer) =>
        offer.id === source.id ? result.source : offer,
      );
      offers = [result.counter, ...offers];
    } else {
      const offer: Offer = {
        id: `OFF-${eventId}`,
        amountMinor,
        date: now.slice(0, 10),
        expirationDate: expiration,
        conditions: conditions.trim(),
        notes: notes.trim(),
        status: "Draft",
        createdAt: now,
        updatedAt: now,
      };
      offers = [offer, ...offers];
    }
    onChange({
      ...deal,
      stage:
        deal.stage === "Lead" || deal.stage === "Viewing"
          ? "Offer Made"
          : deal.stage,
      offers,
      history: [
        {
          id: `HIST-${eventId}`,
          type: "Offer",
          text: countering ? "Counteroffer created." : "Offer created.",
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    });
    setAmount("");
    setExpiration("");
    setConditions("");
    setNotes("");
    setCountering(null);
  }

  function setStatus(offerId: string, status: OfferStatus) {
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    if (status === "Accepted") {
      onChange(acceptOffer(deal, offerId, now));
      return;
    }
    onChange({
      ...deal,
      offers: deal.offers.map((offer) =>
        offer.id === offerId ? { ...offer, status, updatedAt: now } : offer,
      ),
      history: [
        {
          id: `HIST-${eventId}`,
          type: "Offer",
          text: `Offer ${offerId} marked ${status}.`,
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-950">Offers</h3>
          <p className="mt-1 text-sm text-slate-500">
            Every counteroffer keeps its parent link and history.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {deal.offers.length}
        </span>
      </div>
      <form
        onSubmit={addOffer}
        className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"
      >
        <FormField label={countering ? "Counter amount" : "Offer amount"}>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>
        <FormField label="Expiration date">
          <input
            type="date"
            className={inputClass}
            value={expiration}
            onChange={(event) => setExpiration(event.target.value)}
          />
        </FormField>
        <FormField label="Conditions">
          <input
            className={inputClass}
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
          />
        </FormField>
        <FormField label="Notes">
          <input
            className={inputClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </FormField>
        <div className="flex gap-2 sm:col-span-2">
          <button className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white">
            {countering ? "Save counteroffer" : "Add offer"}
          </button>
          {countering && (
            <button
              type="button"
              onClick={() => setCountering(null)}
              className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <div className="mt-4 space-y-3">
        {deal.offers.map((offer) => (
          <article
            key={offer.id}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-bold text-slate-950">
                  {formatMoney(offer.amountMinor, deal.currency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {offer.date}
                  {offer.expirationDate
                    ? ` · Expires ${offer.expirationDate}`
                    : ""}
                  {offer.parentOfferId
                    ? ` · Counter to ${offer.parentOfferId}`
                    : ""}
                </p>
              </div>
              <select
                aria-label="Offer status"
                value={offer.status}
                onChange={(event) =>
                  setStatus(offer.id, event.target.value as OfferStatus)
                }
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700"
              >
                {OFFER_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
            {(offer.conditions || offer.notes) && (
              <p className="mt-3 text-sm text-slate-600">
                {offer.conditions}
                {offer.conditions && offer.notes ? " · " : ""}
                {offer.notes}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setCountering(offer.id);
                setAmount(String(offer.amountMinor / 100));
              }}
              className="mt-3 min-h-11 rounded-xl px-3 text-sm font-bold text-amber-700 hover:bg-amber-50"
            >
              Create counteroffer
            </button>
          </article>
        ))}
        {deal.offers.length === 0 && (
          <p className="py-5 text-center text-sm text-slate-500">
            No offers recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}

function MoneyPanel({
  deal,
  onChange,
}: {
  deal: Deal;
  onChange: (deal: Deal) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recordScheduleId, setRecordScheduleId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState("");
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<PaymentMethod>("Bank transfer");
  const [reference, setReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [error, setError] = useState("");
  const calculation = calculateCommission(
    getCommissionBase(deal),
    deal.commission,
  );

  function patchCommission(patch: Partial<Deal["commission"]>) {
    onChange({
      ...deal,
      commission: { ...deal.commission, ...patch },
      updatedAt: new Date().toISOString(),
    });
  }

  function addSchedule(event: FormEvent) {
    event.preventDefault();
    const amountMinor = toMinorUnits(Number(amount));
    if (!label.trim() || amountMinor <= 0 || !dueDate) {
      setError("Payment label, positive amount, and due date are required.");
      return;
    }
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    const payment: PaymentSchedule = {
      id: `PAY-${eventId}`,
      label: label.trim(),
      amountMinor,
      dueDate,
      status: "Pending",
      records: [],
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    onChange({
      ...deal,
      payments: [...deal.payments, payment],
      history: [
        {
          id: `HIST-${eventId}`,
          type: "Payment",
          text: `Payment scheduled: ${label.trim()}.`,
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    });
    setLabel("");
    setAmount("");
    setDueDate("");
    setError("");
  }

  function recordPayment(event: FormEvent) {
    event.preventDefault();
    const schedule = deal.payments.find((item) => item.id === recordScheduleId);
    if (!schedule) return;
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    const result = addPaymentRecord(schedule, {
      id: `REC-${eventId}`,
      amountMinor: toMinorUnits(Number(paidAmount)),
      paidDate,
      method,
      reference: reference.trim(),
      notes: paymentNotes.trim(),
      createdAt: now,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChange({
      ...deal,
      payments: deal.payments.map((item) =>
        item.id === schedule.id ? result.schedule : item,
      ),
      history: [
        {
          id: `HIST-${eventId}`,
          type: "Payment",
          text: `Payment recorded for ${schedule.label}.`,
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    });
    setRecordScheduleId(null);
    setPaidAmount("");
    setReference("");
    setPaymentNotes("");
    setError("");
  }

  function toggleCancelled(payment: PaymentSchedule) {
    const now = new Date().toISOString();
    const nextStatus =
      payment.status === "Cancelled"
        ? derivePaymentStatus({ ...payment, status: "Pending" })
        : "Cancelled";
    onChange({
      ...deal,
      payments: deal.payments.map((item) =>
        item.id === payment.id
          ? { ...item, status: nextStatus, updatedAt: now }
          : item,
      ),
      history: [
        {
          id: `HIST-${now.replace(/\D/g, "")}`,
          type: "Payment",
          text: `${payment.label} ${nextStatus === "Cancelled" ? "cancelled" : "restored"}.`,
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-950">Commission</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Calculation">
            <select
              className={inputClass}
              value={deal.commission.mode}
              onChange={(event) =>
                patchCommission({
                  mode: event.target.value as Deal["commission"]["mode"],
                })
              }
            >
              {COMMISSION_MODES.map((mode) => (
                <option key={mode}>{mode}</option>
              ))}
            </select>
          </FormField>
          {deal.commission.mode === "Percentage" ? (
            <FormField label="Agency rate (%)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={deal.commission.rateBasisPoints / 100}
                onChange={(event) =>
                  patchCommission({
                    rateBasisPoints: Math.round(
                      Number(event.target.value) * 100,
                    ),
                  })
                }
              />
            </FormField>
          ) : (
            <FormField label="Fixed agency amount">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={deal.commission.fixedAmountMinor / 100}
                onChange={(event) =>
                  patchCommission({
                    fixedAmountMinor: toMinorUnits(Number(event.target.value)),
                  })
                }
              />
            </FormField>
          )}
          <FormField label="Agent share (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              className={inputClass}
              value={deal.commission.agentShareBasisPoints / 100}
              onChange={(event) =>
                patchCommission({
                  agentShareBasisPoints: Math.min(
                    10000,
                    Math.round(Number(event.target.value) * 100),
                  ),
                })
              }
            />
          </FormField>
          <label className="mt-7 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={deal.commission.confirmed}
              onChange={(event) =>
                patchCommission({ confirmed: event.target.checked })
              }
            />{" "}
            Commission confirmed
          </label>
        </div>
        <div className="mt-4 rounded-xl bg-slate-950 p-4 text-white">
          <p className="text-sm text-slate-300">
            Base {formatMoney(getCommissionBase(deal), deal.currency)} ×{" "}
            {deal.commission.mode === "Percentage"
              ? `${deal.commission.rateBasisPoints / 100}%`
              : "fixed amount"}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-slate-400">
                {deal.commission.confirmed
                  ? "Confirmed agency"
                  : "Expected agency"}
              </p>
              <p className="font-bold text-amber-400">
                {formatMoney(calculation.agencyMinor, deal.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Agent share</p>
              <p className="font-bold">
                {formatMoney(calculation.agentMinor, deal.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Agency retained</p>
              <p className="font-bold">
                {formatMoney(calculation.agencyRetainedMinor, deal.currency)}
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-bold text-slate-950">Payment schedule</h3>
        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        )}
        <form
          onSubmit={addSchedule}
          className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3"
        >
          <FormField label="Milestone">
            <input
              className={inputClass}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Deposit"
            />
          </FormField>
          <FormField label="Amount">
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={inputClass}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
          <FormField label="Due date">
            <input
              type="date"
              className={inputClass}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </FormField>
          <button className="min-h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white sm:col-span-3 sm:w-fit">
            Add payment
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {deal.payments.map((payment) => {
            const status = derivePaymentStatus(payment);
            return (
              <article
                key={payment.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-slate-950">{payment.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Due {payment.dueDate} ·{" "}
                      {formatMoney(getPaidAmount(payment), deal.currency)} paid
                      ·{" "}
                      {formatMoney(getRemainingAmount(payment), deal.currency)}{" "}
                      remaining
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${status === "Paid" ? "bg-emerald-50 text-emerald-700" : status === "Overdue" ? "bg-rose-50 text-rose-700" : status === "Cancelled" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {status !== "Paid" && status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecordScheduleId(payment.id);
                        setPaidAmount(
                          String(getRemainingAmount(payment) / 100),
                        );
                      }}
                      className="min-h-11 rounded-xl px-3 text-sm font-bold text-amber-700 hover:bg-amber-50"
                    >
                      Record payment
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCancelled(payment)}
                    className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {status === "Cancelled"
                      ? "Restore schedule"
                      : "Cancel schedule"}
                  </button>
                </div>
              </article>
            );
          })}
          {deal.payments.length === 0 && (
            <p className="py-5 text-center text-sm text-slate-500">
              No payment milestones yet.
            </p>
          )}
        </div>
      </section>
      {recordScheduleId && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4">
          <form
            onSubmit={recordPayment}
            className="w-full max-w-lg rounded-2xl bg-white p-6"
          >
            <h3 className="text-xl font-bold text-slate-950">Record payment</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <FormField label="Amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputClass}
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                />
              </FormField>
              <FormField label="Paid date">
                <input
                  type="date"
                  className={inputClass}
                  value={paidDate}
                  onChange={(event) => setPaidDate(event.target.value)}
                />
              </FormField>
              <FormField label="Method">
                <select
                  className={inputClass}
                  value={method}
                  onChange={(event) =>
                    setMethod(event.target.value as PaymentMethod)
                  }
                >
                  {PAYMENT_METHODS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Reference">
                <input
                  className={inputClass}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Notes">
                  <textarea
                    className={textareaClass}
                    value={paymentNotes}
                    onChange={(event) => setPaymentNotes(event.target.value)}
                  />
                </FormField>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRecordScheduleId(null)}
                className="min-h-11 rounded-xl px-4 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button className="min-h-11 rounded-xl bg-amber-500 px-4 font-bold text-slate-950">
                Save payment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function DealDetails({
  deal,
  client,
  property,
  viewings,
  activities,
  onClose,
  onEdit,
  onChange,
  onStage,
}: {
  deal: Deal;
  client: ReturnType<typeof loadClients>[number] | undefined;
  property: ReturnType<typeof loadProperties>[number] | undefined;
  viewings: ReturnType<typeof loadViewings>;
  activities: ReturnType<typeof loadActivities>;
  onClose: () => void;
  onEdit: () => void;
  onChange: (deal: Deal) => void;
  onStage: (stage: DealStage) => void;
}) {
  const [tab, setTab] = useState<"overview" | "offers" | "money" | "activity">(
    "overview",
  );
  const relatedViewings = viewings.filter(
    (viewing) =>
      viewing.clientId === deal.clientId &&
      viewing.propertyId === deal.propertyId,
  );
  const relatedActivities = getActivitiesForClient(
    activities,
    deal.clientId,
  ).filter(
    (activity) =>
      !activity.propertyId || activity.propertyId === deal.propertyId,
  );
  const timeline = [
    ...deal.history.map((entry) => ({
      id: entry.id,
      text: entry.text,
      date: entry.createdAt,
      label: entry.type,
    })),
    ...relatedActivities.map((entry) => ({
      id: entry.id,
      text: entry.text,
      date: entry.createdAt,
      label: entry.type,
    })),
  ].sort((first, second) => Date.parse(second.date) - Date.parse(first.date));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={18} /> Deals
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
          >
            <Edit3 size={16} /> Edit
          </button>
        </div>
      </div>
      <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-400">
                {deal.id} · {deal.type}
              </p>
              <h1 className="mt-2 text-3xl font-bold">{deal.title}</h1>
              <p className="mt-3 text-slate-300">
                {client?.name ?? "Client unavailable"} ·{" "}
                {property?.title ?? "Property unavailable"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={client?.phone ? `tel:${client.phone}` : undefined}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-bold"
              >
                <Phone size={16} /> Call
              </a>
              <a
                target="_blank"
                rel="noreferrer"
                href={
                  client?.phone
                    ? createWhatsAppUrl(
                        client.phone,
                        `Hello ${client.name}, I am following up about ${property?.title ?? "your EstateFlow deal"}.`,
                      )
                    : undefined
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-slate-950"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Value
              </p>
              <p className="mt-1 text-xl font-bold text-amber-400">
                {formatMoney(deal.expectedValueMinor, deal.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Stage
              </p>
              <p className="mt-1 font-bold">{deal.stage}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Probability
              </p>
              <p className="mt-1 font-bold">{deal.probability}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">
                Agent
              </p>
              <p className="mt-1 font-bold">{deal.assignedAgent}</p>
            </div>
          </div>
        </section>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {(["overview", "offers", "money", "activity"] as const).map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold capitalize ${tab === item ? "bg-amber-500 text-slate-950" : "bg-white text-slate-600"}`}
              >
                {item === "money" ? "Commissions & payments" : item}
              </button>
            ),
          )}
        </div>
        <div className="mt-4">
          {tab === "overview" && (
            <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-950">Deal profile</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Next action
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                      {deal.nextAction || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Action date
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                      {localDateTime(deal.nextActionAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Expected close
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                      {deal.expectedCloseDate || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">
                      Accepted offer
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">
                      {getAcceptedOffer(deal)
                        ? formatMoney(
                            getAcceptedOffer(deal)?.amountMinor ?? 0,
                            deal.currency,
                          )
                        : "None"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {deal.notes || "No notes added."}
                  </p>
                  {deal.lostReason && (
                    <p className="mt-3 text-sm font-semibold text-rose-700">
                      Lost reason: {deal.lostReason}
                    </p>
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-bold text-slate-950">Move stage</h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {DEAL_STAGES.map((stage) => (
                    <button
                      type="button"
                      key={stage}
                      disabled={stage === deal.stage}
                      onClick={() => onStage(stage)}
                      className={`min-h-11 rounded-xl px-3 text-left text-xs font-bold disabled:ring-2 disabled:ring-amber-400 ${stageStyles[stage]}`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Closing requires confirmation. Lost deals require a reason.
                  Reopening preserves the full history.
                </p>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <h3 className="font-bold text-slate-950">Related viewings</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {relatedViewings.map((viewing) => (
                    <div
                      key={viewing.id}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <p className="font-semibold text-slate-800">
                        {viewing.date} · {viewing.time}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {viewing.outcome ?? viewing.status}
                        {viewing.outcomeNotes
                          ? ` · ${viewing.outcomeNotes}`
                          : ""}
                      </p>
                    </div>
                  ))}
                  {relatedViewings.length === 0 && (
                    <p className="text-sm text-slate-500">
                      No linked viewings yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}
          {tab === "offers" && <OfferPanel deal={deal} onChange={onChange} />}
          {tab === "money" && <MoneyPanel deal={deal} onChange={onChange} />}
          {tab === "activity" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-slate-950">Activity timeline</h3>
              <div className="mt-5 space-y-4">
                {timeline.map((entry) => (
                  <div
                    key={`${entry.label}-${entry.id}`}
                    className="flex gap-3"
                  >
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                    <div>
                      <p className="text-sm text-slate-700">{entry.text}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {entry.label} · {localDateTime(entry.date)}
                      </p>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export function DealsPage() {
  const [clients] = useState(loadClients);
  const [properties, setProperties] = useState(loadProperties);
  const [viewings] = useState(() => loadViewings(properties));
  const [activities] = useState(loadActivities);
  const [deals, setDeals] = useState(() => loadDeals(clients, properties));
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"All" | DealStage>("All");
  const [type, setType] = useState<"All" | Deal["type"]>("All");
  const [sort, setSort] = useState<SortOption>("updated");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState("");
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deals
      .filter(
        (deal) =>
          deal.archived === showArchived &&
          (stage === "All" || deal.stage === stage) &&
          (type === "All" || deal.type === type) &&
          (!term ||
            [
              deal.id,
              deal.title,
              deal.assignedAgent,
              clientById.get(deal.clientId)?.name ?? "",
              propertyById.get(deal.propertyId)?.title ?? "",
            ].some((value) => value.toLowerCase().includes(term))),
      )
      .sort((first, second) =>
        sort === "value-high"
          ? second.expectedValueMinor - first.expectedValueMinor
          : sort === "value-low"
            ? first.expectedValueMinor - second.expectedValueMinor
            : sort === "action"
              ? (first.nextActionAt || "z").localeCompare(
                  second.nextActionAt || "z",
                )
              : Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
      );
  }, [
    clientById,
    deals,
    propertyById,
    search,
    showArchived,
    sort,
    stage,
    type,
  ]);
  const stageCounts = useMemo(
    () =>
      new Map(
        DEAL_STAGES.map((item) => [
          item,
          deals.filter((deal) => !deal.archived && deal.stage === item).length,
        ]),
      ),
    [deals],
  );
  const selected = deals.find((deal) => deal.id === selectedId);
  const editing =
    editingId && editingId !== "new"
      ? deals.find((deal) => deal.id === editingId)
      : undefined;

  function persist(next: Deal[]) {
    const result = saveDeals(next);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setDeals(next);
    setError("");
    return true;
  }

  function saveDraft(draft: DealDraft) {
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    if (editing) {
      persist(
        deals.map((deal) =>
          deal.id === editing.id
            ? {
                ...deal,
                ...draft,
                history: [
                  {
                    id: `HIST-${eventId}`,
                    type: "Updated",
                    text: "Deal profile updated.",
                    createdAt: now,
                  },
                  ...deal.history,
                ],
                updatedAt: now,
              }
            : deal,
        ),
      );
    } else {
      const created = createDeal(draft, deals);
      persist([created, ...deals]);
      setSelectedId(created.id);
    }
    setEditingId(null);
  }

  function updateDeal(updated: Deal) {
    persist(deals.map((deal) => (deal.id === updated.id ? updated : deal)));
  }

  function moveStage(deal: Deal, nextStage: DealStage) {
    if (nextStage === deal.stage) return;
    let lostReason = deal.lostReason;
    if (nextStage === "Closed Lost") {
      lostReason = window.prompt("Why was this deal lost?")?.trim() ?? "";
    }
    const validation = canTransitionDeal(deal, nextStage, lostReason);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    if (
      isClosedStage(nextStage) &&
      !window.confirm(`Confirm moving this deal to ${nextStage}?`)
    )
      return;
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    const reopening = isClosedStage(deal.stage) && !isClosedStage(nextStage);
    const updated: Deal = {
      ...deal,
      stage: nextStage,
      lostReason: nextStage === "Closed Lost" ? lostReason : deal.lostReason,
      probability:
        nextStage === "Closed Won"
          ? 100
          : nextStage === "Closed Lost"
            ? 0
            : deal.probability,
      history: [
        {
          id: `HIST-${eventId}`,
          type: reopening ? "Reopened" : "Stage",
          text: reopening
            ? `Deal reopened from ${deal.stage} to ${nextStage}.`
            : `Stage changed from ${deal.stage} to ${nextStage}${lostReason && nextStage === "Closed Lost" ? `: ${lostReason}` : "."}`,
          createdAt: now,
        },
        ...deal.history,
      ],
      updatedAt: now,
    };
    if (nextStage === "Closed Won") {
      const nextProperties = properties.map((property) =>
        property.id === deal.propertyId
          ? {
              ...property,
              status: getClosedPropertyStatus(deal),
              updatedAt: now,
              updatedLabel: "Updated just now",
            }
          : property,
      );
      const propertyResult = saveProperties(nextProperties);
      if (!propertyResult.ok) {
        setError(propertyResult.message);
        return;
      }
      setProperties(nextProperties);
    }
    updateDeal(updated);
  }

  function duplicate(deal: Deal) {
    const now = new Date().toISOString();
    const eventId = now.replace(/\D/g, "");
    const copy: Deal = {
      ...deal,
      id: `DEAL-${eventId.slice(-8)}-COPY`,
      title: `${deal.title} (copy)`,
      stage: "Lead",
      probability: 20,
      archived: false,
      offers: [],
      payments: [],
      lostReason: "",
      history: [
        {
          id: `HIST-${eventId}`,
          type: "Created",
          text: `Duplicated from ${deal.id}.`,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    persist([copy, ...deals]);
  }

  function remove(deal: Deal) {
    if (
      !window.confirm(
        `Permanently delete ${deal.title}? This cannot be undone.`,
      )
    )
      return;
    persist(deals.filter((item) => item.id !== deal.id));
    setSelectedId(null);
  }

  return (
    <DashboardShell>
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">DEAL PIPELINE</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Deals
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Move every matched client and property from first interest to offer,
            contract, commission, and payment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditingId("new")}
          disabled={!clients.length || !properties.length}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          <Plus size={18} /> Create deal
        </button>
      </section>
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-center justify-between rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700"
        >
          <span>{error}</span>
          <button aria-label="Dismiss" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {DEAL_STAGES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStage(stage === item ? "All" : item)}
            className={`rounded-2xl border p-4 text-left transition ${stage === item ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-xs font-semibold text-slate-500">{item}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {stageCounts.get(item) ?? 0}
            </p>
          </button>
        ))}
      </section>
      <section className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <label className="relative">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <input
            aria-label="Search deals"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-amber-500"
            placeholder="Search deal, client, property, or agent"
          />
        </label>
        <select
          aria-label="Deal type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "All" | Deal["type"])
          }
          className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm"
        >
          <option>All</option>
          <option>Sale</option>
          <option>Rental</option>
        </select>
        <select
          aria-label="Sort deals"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortOption)}
          className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm"
        >
          <option value="updated">Recently updated</option>
          <option value="value-high">Highest value</option>
          <option value="value-low">Lowest value</option>
          <option value="action">Next action</option>
        </select>
        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className="min-h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600"
        >
          {showArchived ? "Show active" : "Show archived"}
        </button>
      </section>
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">
          {filtered.length} {filtered.length === 1 ? "deal" : "deals"}
        </p>
        {stage !== "All" && (
          <button
            type="button"
            onClick={() => setStage("All")}
            className="text-sm font-bold text-amber-700"
          >
            Clear stage filter
          </button>
        )}
      </div>
      <section className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((deal) => {
          const client = clientById.get(deal.clientId);
          const property = propertyById.get(deal.propertyId);
          return (
            <article
              key={deal.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setSelectedId(deal.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${stageStyles[deal.stage]}`}
                  >
                    {deal.stage}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {deal.probability}%
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-bold text-slate-950">
                  {deal.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {client?.name ?? "Missing client"} ·{" "}
                  {property?.title ?? "Missing property"}
                </p>
                <p className="mt-4 text-2xl font-bold text-slate-950">
                  {formatMoney(deal.expectedValueMinor, deal.currency)}
                </p>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarClock size={16} />
                  <span>
                    {deal.nextAction || "No next action"} ·{" "}
                    {localDateTime(deal.nextActionAt)}
                  </span>
                </div>
              </button>
              <div className="mt-5 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
                <button
                  aria-label="Edit deal"
                  onClick={() => setEditingId(deal.id)}
                  className="grid min-h-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <Edit3 size={17} />
                </button>
                <button
                  aria-label="Duplicate deal"
                  onClick={() => duplicate(deal)}
                  className="grid min-h-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <Copy size={17} />
                </button>
                <button
                  aria-label={deal.archived ? "Restore deal" : "Archive deal"}
                  onClick={() =>
                    updateDeal({
                      ...deal,
                      archived: !deal.archived,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="grid min-h-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <Archive size={17} />
                </button>
                <button
                  aria-label="Delete deal"
                  onClick={() => remove(deal)}
                  className="grid min-h-11 place-items-center rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center md:col-span-2 2xl:col-span-3">
            <BriefcaseBusiness className="mx-auto text-slate-400" size={32} />
            <h2 className="mt-3 font-bold text-slate-950">No deals found</h2>
            <p className="mt-1 text-sm text-slate-500">
              Adjust the filters or create a deal linked to an existing client
              and property.
            </p>
          </div>
        )}
      </section>
      {editingId && (
        <DealForm
          deal={editing}
          clients={clients}
          properties={properties}
          onClose={() => setEditingId(null)}
          onSave={saveDraft}
        />
      )}
      {selected && (
        <DealDetails
          deal={selected}
          client={clientById.get(selected.clientId)}
          property={propertyById.get(selected.propertyId)}
          viewings={viewings}
          activities={activities}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditingId(selected.id)}
          onChange={updateDeal}
          onStage={(nextStage) => moveStage(selected, nextStage)}
        />
      )}
    </DashboardShell>
  );
}
