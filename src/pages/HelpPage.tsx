import { useState } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
const modules = [
  [
    "Properties",
    "Create and maintain listings, photos, status, ownership, and matching data.",
  ],
  [
    "Clients",
    "Track requirements, budgets, follow-ups, activities, and viewings.",
  ],
  ["Smart Matches", "Review explainable client/property compatibility scores."],
  [
    "Viewings",
    "Schedule visits, record outcomes, and trigger connected reminders.",
  ],
  [
    "Deals & Offers",
    "Move opportunities through the pipeline and retain offer history.",
  ],
  ["Contracts", "Create reviewed sale or rental drafts from accepted offers."],
  [
    "Payments",
    "Record schedules and receipts without overstating collected money.",
  ],
  [
    "Tasks & Automation",
    "Manage follow-ups and local rules that run while EstateFlow is open.",
  ],
  ["Reports", "Review saved performance with currencies kept separate."],
];
export function HelpPage() {
  const [open, setOpen] = useState("Getting started");
  return (
    <DashboardShell>
      <section>
        <p className="text-sm font-bold text-amber-700">
          GUIDES & TROUBLESHOOTING
        </p>
        <h1 className="mt-2 text-3xl font-bold">Help Center</h1>
        <p className="mt-2 text-slate-600">
          Practical guidance for the complete EstateFlow local workflow.
        </p>
      </section>
      <section className="mt-6 rounded-2xl bg-slate-950 p-6 text-white">
        <h2 className="font-bold text-amber-400">Complete workflow</h2>
        <p className="mt-3 overflow-x-auto whitespace-nowrap text-sm font-semibold">
          Property → Client → Match → Viewing → Deal → Offer → Contract →
          Payment
        </p>
      </section>
      <div className="mt-6 grid gap-5 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-2">
          {[
            "Getting started",
            "Module guides",
            "FAQ",
            "Local data",
            "Troubleshooting",
            "Keyboard shortcuts",
          ].map((x) => (
            <button
              key={x}
              onClick={() => setOpen(x)}
              className={`min-h-11 w-full rounded-xl px-4 text-left font-bold ${open === x ? "bg-amber-500" : "bg-white"}`}
            >
              {x}
            </button>
          ))}
        </nav>
        <article className="rounded-2xl border bg-white p-6">
          {open === "Getting started" && (
            <>
              <h2 className="text-xl font-bold">Getting started checklist</h2>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-600">
                <li>Review agency defaults and create the local team.</li>
                <li>Add real properties and client requirements.</li>
                <li>Schedule viewings and record outcomes.</li>
                <li>
                  Create deals and accept an offer before drafting a contract.
                </li>
                <li>
                  Export regular JSON backups and download critical documents.
                </li>
              </ul>
            </>
          )}
          {open === "Module guides" && (
            <>
              <h2 className="text-xl font-bold">Module guides</h2>
              <div className="mt-4 space-y-4">
                {modules.map(([name, text]) => (
                  <section key={name}>
                    <h3 className="font-bold">{name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                  </section>
                ))}
              </div>
            </>
          )}
          {open === "FAQ" && (
            <>
              <h2 className="text-xl font-bold">Frequently asked questions</h2>
              <h3 className="mt-4 font-bold">
                Is this multi-user or secure authentication?
              </h3>
              <p className="mt-1 text-slate-600">
                No. This prototype stores local records in one browser. Team
                roles are organizational labels only.
              </p>
              <h3 className="mt-4 font-bold">
                Do automations run when the app is closed?
              </h3>
              <p className="mt-1 text-slate-600">
                No. Local checks run while EstateFlow is open or when Run checks
                now is used.
              </p>
            </>
          )}
          {open === "Local data" && (
            <>
              <h2 className="text-xl font-bold">Local storage and backup</h2>
              <p className="mt-4 leading-7 text-slate-600">
                Business records use browser localStorage. Uploaded document
                files use IndexedDB. Clearing browser data, changing profiles,
                or using another device can make records unavailable. Export
                backups regularly and separately download critical files.
              </p>
            </>
          )}
          {open === "Troubleshooting" && (
            <>
              <h2 className="text-xl font-bold">Troubleshooting</h2>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-slate-600">
                <li>Refresh after importing a backup.</li>
                <li>Check browser storage permissions if saving fails.</li>
                <li>Accept an offer before creating a contract.</li>
                <li>
                  Use filters' clear actions when a saved record is not visible.
                </li>
              </ul>
            </>
          )}
          {open === "Keyboard shortcuts" && (
            <>
              <h2 className="text-xl font-bold">Keyboard shortcuts</h2>
              <dl className="mt-4 grid gap-3">
                <div>
                  <dt className="font-bold">Escape</dt>
                  <dd className="text-slate-600">
                    Close supported dialogs or the mobile navigation drawer.
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Tab / Shift+Tab</dt>
                  <dd className="text-slate-600">
                    Move through actions and form controls.
                  </dd>
                </div>
                <div>
                  <dt className="font-bold">Enter / Space</dt>
                  <dd className="text-slate-600">
                    Activate focused buttons and links.
                  </dd>
                </div>
              </dl>
            </>
          )}
          <p className="mt-8 border-t pt-4 text-xs text-slate-400">
            EstateFlow version 0.0.0 · Data schema 2026.07.25
          </p>
        </article>
      </div>
    </DashboardShell>
  );
}
