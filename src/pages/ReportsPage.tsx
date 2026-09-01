import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadClients } from "../features/clients/client-storage";
import { loadContracts } from "../features/contracts/contract-storage";
import { loadDeals } from "../features/deals/deal-storage";
import { formatMoney } from "../features/deals/deal-utils";
import { loadDocumentMetadata } from "../features/documents/document-storage";
import { loadProperties } from "../features/properties/property-storage";
import {
  buildReport,
  getDateRange,
  rowsToCsv,
  type DatePreset,
} from "../features/reports/report-utils";
import { loadTasks } from "../features/tasks/task-storage";
import { loadViewings } from "../features/viewings/viewing-storage";
export function ReportsPage() {
  const navigate = useNavigate(),
    [preset, setPreset] = useState<DatePreset>("This month"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [dealType, setDealType] = useState("All"),
    [stage, setStage] = useState("All"),
    [agent, setAgent] = useState("All"),
    [propertyStatus, setPropertyStatus] = useState("All"),
    [location, setLocation] = useState("All");
  const properties = loadProperties(),
    clients = loadClients(),
    deals = loadDeals(clients, properties),
    viewings = loadViewings(properties),
    tasks = loadTasks(),
    contracts = loadContracts(),
    documents = loadDocumentMetadata(),
    filteredDeals = deals.filter(
      (deal) =>
        (dealType === "All" || deal.type === dealType) &&
        (stage === "All" || deal.stage === stage) &&
        (agent === "All" || deal.assignedAgent === agent),
    ),
    filteredProperties = properties.filter(
      (property) =>
        (propertyStatus === "All" || property.status === propertyStatus) &&
        (location === "All" || property.district === location),
    ),
    report = buildReport(
      filteredDeals,
      filteredProperties,
      clients,
      viewings,
      tasks,
      contracts,
      documents,
      getDateRange(preset, new Date(), { from, to }),
    );
  const exportCsv = () => {
    const csv = rowsToCsv(
        filteredDeals.map((d) => ({
          id: d.id,
          title: d.title,
          type: d.type,
          stage: d.stage,
          currency: d.currency,
          valueMinor: d.expectedValueMinor,
          agent: d.assignedAgent,
        })),
      ),
      url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      a = document.createElement("a");
    a.href = url;
    a.download = "estateflow-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const cards = [
    ["Active deals", report.activeDeals, "/deals"],
    ["Won deals", report.wonDeals, "/deals"],
    ["Properties", report.properties, "/properties"],
    ["Clients", report.clients, "/clients"],
    ["Viewings", report.viewings, "/viewings"],
    ["Completed tasks", report.completedTasks, "/tasks"],
    ["Signed contracts", report.signedContracts, "/contracts"],
    ["Documents", report.documents, "/documents"],
  ];
  return (
    <DashboardShell>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-700">LIVE ANALYTICS</p>
          <h1 className="mt-2 text-3xl font-bold">Reports</h1>
          <p className="mt-2 text-slate-600">
            Every value is calculated from saved EstateFlow records. USD and IQD
            remain separate.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={exportCsv}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-white px-4 font-bold"
          >
            <Download size={17} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 font-bold text-white"
          >
            <Printer size={17} /> Print
          </button>
        </div>
      </section>
      <section className="mt-6 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        <select
          value={preset}
          onChange={(e) => setPreset(e.target.value as DatePreset)}
          className="min-h-12 rounded-xl border px-4"
        >
          {[
            "This month",
            "Last month",
            "This quarter",
            "This year",
            "Custom range",
            "All time",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        {preset === "Custom range" && (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-h-12 rounded-xl border px-4"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-h-12 rounded-xl border px-4"
            />
          </>
        )}
        <select
          value={dealType}
          onChange={(e) => setDealType(e.target.value)}
          className="min-h-12 rounded-xl border px-4"
        >
          <option>All</option>
          <option>Sale</option>
          <option>Rental</option>
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="min-h-12 rounded-xl border px-4"
        >
          <option>All</option>
          {[...new Set(deals.map((deal) => deal.stage))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="min-h-12 rounded-xl border px-4"
        >
          <option>All</option>
          {[...new Set(deals.map((deal) => deal.assignedAgent))].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <select
          value={propertyStatus}
          onChange={(e) => setPropertyStatus(e.target.value)}
          className="min-h-12 rounded-xl border px-4"
        >
          <option>All</option>
          {[...new Set(properties.map((property) => property.status))].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="min-h-12 rounded-xl border px-4"
        >
          <option>All</option>
          {[...new Set(properties.map((property) => property.district))].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <button
            key={label}
            onClick={() => navigate(String(href))}
            className="rounded-2xl border bg-white p-5 text-left"
          >
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </button>
        ))}
      </section>
      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <Money title="USD performance" currency="USD" data={report.USD} />
        <Money title="IQD performance" currency="IQD" data={report.IQD} />
        <article className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Sales versus rentals</h2>
          <div className="mt-5 space-y-4">
            <Bar
              label="Sales"
              value={report.sales}
              max={Math.max(report.sales, report.rentals, 1)}
            />
            <Bar
              label="Rentals"
              value={report.rentals}
              max={Math.max(report.sales, report.rentals, 1)}
            />
          </div>
        </article>
        <article className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Data needing attention</h2>
          <p className="mt-4 text-sm text-slate-600">
            {report.overduePayments} overdue payments
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {
              tasks.filter(
                (t) => t.status !== "Completed" && t.status !== "Cancelled",
              ).length
            }{" "}
            open tasks
          </p>
        </article>
      </section>
    </DashboardShell>
  );
}
function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-3 rounded-full bg-slate-100">
        <div
          className="h-3 rounded-full bg-amber-500"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
function Money({
  title,
  currency,
  data,
}: {
  title: string;
  currency: "USD" | "IQD";
  data: {
    pipelineMinor: number;
    wonMinor: number;
    expectedCommissionMinor: number;
    collectedMinor: number;
    outstandingMinor: number;
  };
}) {
  return (
    <article className="rounded-2xl bg-slate-950 p-5 text-white">
      <h2 className="font-bold text-amber-400">{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-slate-400">Pipeline</dt>
          <dd className="mt-1 font-bold">
            {formatMoney(data.pipelineMinor, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Won</dt>
          <dd className="mt-1 font-bold">
            {formatMoney(data.wonMinor, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Commission</dt>
          <dd className="mt-1 font-bold">
            {formatMoney(data.expectedCommissionMinor, currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Collected / outstanding</dt>
          <dd className="mt-1 font-bold">
            {formatMoney(data.collectedMinor, currency)} /{" "}
            {formatMoney(data.outstandingMinor, currency)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
