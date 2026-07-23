import { FileSignature, Printer, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadClients } from "../features/clients/client-storage";
import {
  CONTRACT_STATUSES,
  type Contract,
  type ContractStatus,
} from "../features/contracts/contract-data";
import {
  createContract,
  loadContracts,
  saveContracts,
  signContract,
  updateContract,
} from "../features/contracts/contract-storage";
import { loadDeals, saveDeals } from "../features/deals/deal-storage";
import { formatMoney, getAcceptedOffer } from "../features/deals/deal-utils";
import { loadDocumentMetadata } from "../features/documents/document-storage";
import { loadProperties } from "../features/properties/property-storage";
import { loadTasks } from "../features/tasks/task-storage";
const input =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100";
export function ContractsPage() {
  const [clients] = useState(loadClients),
    [properties] = useState(loadProperties),
    [deals, setDeals] = useState(() => loadDeals(clients, properties)),
    [items, setItems] = useState(loadContracts),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState("");
  const documents = loadDocumentMetadata();
  const tasks = loadTasks();
  const eligible = deals.filter(
    (d) => getAcceptedOffer(d) && !items.some((c) => c.dealId === d.id),
  );
  const contract = items.find((c) => c.id === selected);
  const persist = (next: Contract[]) => {
    if (!saveContracts(next)) {
      setError("Contract changes could not be saved.");
      return;
    }
    setItems(next);
    setError("");
  };
  const create = (dealId: string) => {
    const deal = deals.find((d) => d.id === dealId),
      client = clients.find((c) => c.id === deal?.clientId),
      property = properties.find((p) => p.id === deal?.propertyId);
    if (!deal || !client || !property) return;
    const next = createContract(deal, client, property);
    if (next) {
      persist([next, ...items]);
      setSelected(next.id);
    }
  };
  const status = (value: ContractStatus) => {
    if (!contract) return;
    if (
      (value === "Signed" || value === "Cancelled") &&
      !window.confirm(
        `Confirm ${value.toLowerCase()} for ${contract.contractNumber}?`,
      )
    )
      return;
    const next =
      value === "Signed"
        ? signContract(contract)
        : { ...contract, status: value, updatedAt: new Date().toISOString() };
    persist(items.map((c) => (c.id === contract.id ? next : c)));
    if (value === "Signed") {
      const now = new Date().toISOString();
      const nextDeals = deals.map((d) =>
        d.id === contract.dealId
          ? {
              ...d,
              history: [
                {
                  id: `HIST-CON-${now.replace(/\D/g, "")}`,
                  type: "Updated" as const,
                  text: `Contract ${contract.contractNumber} signed.`,
                  createdAt: now,
                },
                ...d.history,
              ],
              updatedAt: now,
            }
          : d,
      );
      saveDeals(nextDeals);
      setDeals(nextDeals);
    }
  };
  return (
    <DashboardShell>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-700">LEGAL WORKFLOW</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Contracts</h1>
          <p className="mt-2 text-slate-600">
            Professional sale and rental templates connected to accepted offers.
          </p>
        </div>
        {eligible.length > 0 && (
          <select
            aria-label="Create contract from accepted offer"
            defaultValue=""
            onChange={(e) => {
              create(e.target.value);
              e.target.value = "";
            }}
            className="min-h-12 rounded-xl bg-amber-500 px-4 font-bold text-slate-950"
          >
            <option value="" disabled>
              + Create from accepted offer
            </option>
            {eligible.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
      </section>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        Templates are operational starting points and require review by a
        qualified local legal professional. EstateFlow does not provide legally
        binding electronic signatures.
      </div>
      {error && (
        <p role="alert" className="mt-4 bg-rose-50 p-3 text-rose-700">
          {error}
        </p>
      )}
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"
          >
            <div className="flex justify-between">
              <FileSignature className="text-amber-600" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                {c.status}
              </span>
            </div>
            <h2 className="mt-4 font-bold text-slate-950">
              {c.contractNumber}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {c.clientName} · {c.propertyTitle}
            </p>
            <p className="mt-4 text-xl font-bold">
              {formatMoney(c.agreedValueMinor, c.currency)}
            </p>
          </button>
        ))}
        {!items.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center md:col-span-2">
            <p className="font-bold">No contracts yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Accept an offer in a deal, then create its contract here.
            </p>
          </div>
        )}
      </section>
      {contract && (
        <ContractEditor
          contract={contract}
          documentCount={
            documents.filter(
              (d) => d.entityType === "Contract" && d.entityId === contract.id,
            ).length
          }
          taskCount={
            tasks.filter(
              (task) => !task.archived && task.contractId === contract.id,
            ).length
          }
          onClose={() => setSelected(null)}
          onSave={(patch) =>
            persist(
              items.map((c) =>
                c.id === contract.id ? updateContract(c, patch) : c,
              ),
            )
          }
          onStatus={status}
        />
      )}
    </DashboardShell>
  );
}
function ContractEditor({
  contract,
  documentCount,
  taskCount,
  onClose,
  onSave,
  onStatus,
}: {
  contract: Contract;
  documentCount: number;
  taskCount: number;
  onClose: () => void;
  onSave: (p: Parameters<typeof updateContract>[1]) => void;
  onStatus: (s: ContractStatus) => void;
}) {
  const locked = contract.status === "Signed";
  const [terms, setTerms] = useState(contract.terms),
    [clauses, setClauses] = useState(contract.clauses.join("\n")),
    [notes, setNotes] = useState(contract.notes),
    [startDate, setStartDate] = useState(contract.startDate),
    [endDate, setEndDate] = useState(contract.endDate),
    [agent, setAgent] = useState(contract.responsibleAgent),
    [deposit, setDeposit] = useState(String(contract.depositMinor / 100));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      terms,
      clauses: clauses
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      notes,
      startDate,
      endDate,
      responsibleAgent: agent.trim(),
      depositMinor: Math.round(Math.max(0, Number(deposit)) * 100),
    });
  };
  const snapshot = contract.signedSnapshot ?? contract;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 print:hidden">
        <button
          onClick={onClose}
          className="min-h-11 rounded-xl px-4 font-bold"
        >
          ← Contracts
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 font-bold"
          >
            <Printer size={16} /> Print / PDF
          </button>
          <button aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-5 print:p-0">
        <article className="rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
          <p className="text-center text-sm font-bold text-amber-700">
            ESTATEFLOW {snapshot.type.toUpperCase()} CONTRACT
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold">
            {snapshot.contractNumber}
          </h1>
          <p className="mt-3 text-center text-sm text-slate-500">
            {contract.status}
            {contract.signedAt
              ? ` · Locked ${contract.signedAt.slice(0, 10)}`
              : ""}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <p>
              <b>Client:</b> {snapshot.clientName}
              <br />
              {snapshot.clientPhone}
            </p>
            <p>
              <b>Owner:</b> {snapshot.ownerName}
            </p>
            <p>
              <b>Property:</b> {snapshot.propertyTitle}
              <br />
              {snapshot.propertyLocation}
            </p>
            <p>
              <b>Agreed value:</b>{" "}
              {formatMoney(snapshot.agreedValueMinor, snapshot.currency)}
              <br />
              <b>Commission:</b>{" "}
              {formatMoney(snapshot.commissionMinor, snapshot.currency)}
            </p>
            <p>
              <b>Start:</b> {snapshot.startDate || "Not set"}
              <br />
              <b>End:</b> {snapshot.endDate || "Not set"}
            </p>
            <p>
              <b>Responsible agent:</b> {snapshot.responsibleAgent}
            </p>
          </div>
          {locked ? (
            <div className="mt-8">
              <p className="leading-7">{snapshot.terms}</p>
              <ol className="mt-5 list-decimal space-y-3 pl-5">
                {snapshot.clauses.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
              {snapshot.notes && (
                <p className="mt-5">
                  <b>Notes:</b> {snapshot.notes}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4 print:hidden">
              <label className="block font-semibold">
                Deposit
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  className={input}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block font-semibold">
                  Start date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={input}
                  />
                </label>
                <label className="block font-semibold">
                  End date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={input}
                  />
                </label>
              </div>
              <label className="block font-semibold">
                Responsible agent
                <input
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  className={input}
                />
              </label>
              <label className="block font-semibold">
                Terms
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className={`${input} min-h-28 py-3`}
                />
              </label>
              <label className="block font-semibold">
                Clauses (one per line)
                <textarea
                  value={clauses}
                  onChange={(e) => setClauses(e.target.value)}
                  className={`${input} min-h-40 py-3`}
                />
              </label>
              <label className="block font-semibold">
                Notes
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${input} min-h-24 py-3`}
                />
              </label>
              <button className="min-h-12 rounded-xl bg-amber-500 px-5 font-bold">
                Save new version
              </button>
            </form>
          )}
          <div className="mt-8 border-t pt-6 print:hidden">
            <div className="flex flex-wrap gap-2">
              {CONTRACT_STATUSES.map((s) => (
                <button
                  disabled={locked || s === contract.status}
                  onClick={() => onStatus(s)}
                  key={s}
                  className="min-h-11 rounded-xl border px-3 text-sm font-bold disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {contract.versions.length} versions · {documentCount} linked
              documents · {taskCount} linked tasks
            </p>
            {contract.versions.map((v) => (
              <p key={v.id} className="mt-2 text-sm text-slate-600">
                v{v.version} · {v.summary} ·{" "}
                {v.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            ))}
          </div>
          <p className="mt-10 text-xs text-slate-500">
            Legal review required before use. This printout is not an
            electronic-signature service.
          </p>
        </article>
      </main>
    </div>
  );
}
