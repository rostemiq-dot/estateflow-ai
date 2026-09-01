import type { Client } from "../clients/client-data";
import type { Contract } from "../contracts/contract-data";
import type { Deal } from "../deals/deal-data";
import {
  calculateCommission,
  derivePaymentStatus,
  getCommissionBase,
  getPaidAmount,
  getRemainingAmount,
  isClosedStage,
} from "../deals/deal-utils";
import type { DocumentMetadata } from "../documents/document-data";
import type { Property } from "../properties/property-data";
import type { Task } from "../tasks/task-data";
import type { Viewing } from "../viewings/viewing-data";
export type DatePreset =
  | "This month"
  | "Last month"
  | "This quarter"
  | "This year"
  | "Custom range"
  | "All time";
export function getDateRange(
  preset: DatePreset,
  now = new Date(),
  custom?: { from: string; to: string },
) {
  if (preset === "All time") return { from: 0, to: Number.MAX_SAFE_INTEGER };
  if (preset === "Custom range")
    return {
      from: Date.parse(custom?.from ?? ""),
      to: Date.parse(`${custom?.to ?? ""}T23:59:59`),
    };
  const y = now.getFullYear(),
    m = now.getMonth();
  if (preset === "This month")
    return {
      from: new Date(y, m, 1).getTime(),
      to: new Date(y, m + 1, 1).getTime() - 1,
    };
  if (preset === "Last month")
    return {
      from: new Date(y, m - 1, 1).getTime(),
      to: new Date(y, m, 1).getTime() - 1,
    };
  if (preset === "This quarter") {
    const q = Math.floor(m / 3) * 3;
    return {
      from: new Date(y, q, 1).getTime(),
      to: new Date(y, q + 3, 1).getTime() - 1,
    };
  }
  return {
    from: new Date(y, 0, 1).getTime(),
    to: new Date(y + 1, 0, 1).getTime() - 1,
  };
}
export function inDateRange(date: string, range: { from: number; to: number }) {
  const t = Date.parse(date);
  return Number.isFinite(t) && t >= range.from && t <= range.to;
}
export function buildReport(
  deals: readonly Deal[],
  properties: readonly Property[],
  clients: readonly Client[],
  viewings: readonly Viewing[],
  tasks: readonly Task[],
  contracts: readonly Contract[],
  documents: readonly DocumentMetadata[],
  range: { from: number; to: number },
) {
  const filtered = deals.filter((d) => inDateRange(d.createdAt, range));
  const money = (currency: "USD" | "IQD") => {
    const ds = filtered.filter((d) => d.currency === currency),
      schedules = ds.flatMap((d) => d.payments);
    return {
      pipelineMinor: ds
        .filter((d) => !isClosedStage(d.stage))
        .reduce((n, d) => n + d.expectedValueMinor, 0),
      wonMinor: ds
        .filter((d) => d.stage === "Closed Won")
        .reduce((n, d) => n + d.expectedValueMinor, 0),
      expectedCommissionMinor: ds.reduce(
        (n, d) =>
          n +
          calculateCommission(getCommissionBase(d), d.commission).agencyMinor,
        0,
      ),
      collectedMinor: schedules.reduce((n, p) => n + getPaidAmount(p), 0),
      outstandingMinor: schedules
        .filter((p) => p.status !== "Cancelled")
        .reduce((n, p) => n + getRemainingAmount(p), 0),
    };
  };
  return {
    deals: filtered.length,
    activeDeals: filtered.filter((d) => !isClosedStage(d.stage)).length,
    wonDeals: filtered.filter((d) => d.stage === "Closed Won").length,
    sales: filtered.filter((d) => d.type === "Sale").length,
    rentals: filtered.filter((d) => d.type === "Rental").length,
    properties: properties.length,
    clients: clients.length,
    viewings: viewings.filter((v) => inDateRange(v.createdAt, range)).length,
    completedTasks: tasks.filter(
      (t) => t.status === "Completed" && inDateRange(t.updatedAt, range),
    ).length,
    overduePayments: filtered
      .flatMap((d) => d.payments)
      .filter((p) => derivePaymentStatus(p) === "Overdue").length,
    signedContracts: contracts.filter(
      (c) =>
        c.status === "Signed" && inDateRange(c.signedAt ?? c.updatedAt, range),
    ).length,
    documents: documents.filter((d) => inDateRange(d.createdAt, range)).length,
    USD: money("USD"),
    IQD: money("IQD"),
  };
}
export function rowsToCsv(
  rows: readonly Record<string, string | number>[],
): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return [
    keys.map(escape).join(","),
    ...rows.map((r) => keys.map((k) => escape(r[k])).join(",")),
  ].join("\n");
}
