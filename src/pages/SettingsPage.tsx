import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import {
  applyCompleteBackup,
  createCompleteBackup,
  validateBackup,
  type EstateFlowBackup,
} from "../features/settings/backup";
import {
  defaultSettings,
  type AppSettings,
} from "../features/settings/settings-data";
import {
  deleteCustomOption,
  loadSettings,
  saveSettings,
} from "../features/settings/settings-storage";
import {
  loadProperties,
  saveProperties,
} from "../features/properties/property-storage";
import type {
  PropertyStatus,
  PropertyType,
} from "../features/properties/property-data";
import { loadClients, saveClients } from "../features/clients/client-storage";
import type { ClientStage } from "../features/clients/client-data";
const input = "min-h-12 w-full rounded-xl border border-slate-200 px-4 text-sm";
export function SettingsPage() {
  const [settings, setSettings] = useState(loadSettings),
    [agencyDraft, setAgencyDraft] = useState(loadSettings),
    [tab, setTab] = useState("Agency"),
    [message, setMessage] = useState(""),
    [backup, setBackup] = useState<EstateFlowBackup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const save = (next: AppSettings) => {
    saveSettings(next);
    setSettings(next);
    setMessage("Settings saved.");
  };
  const patch = (p: Partial<AppSettings>) => save({ ...settings, ...p });
  const patchAgency = (p: Partial<AppSettings>) =>
    setAgencyDraft((current) => ({ ...current, ...p }));
  const saveAgency = () => save(agencyDraft);
  function usedLabelsFor(key: string) {
    if (key === "propertyTypes")
      return loadProperties().map((property) => property.propertyType);
    if (key === "propertyStatuses")
      return loadProperties().map((property) => property.status);
    if (key === "clientStatuses")
      return loadClients().map((client) => client.stage);
    return [];
  }
  function replaceUsedOption(
    key: string,
    oldLabel: string,
    replacement: string,
  ) {
    if (key === "propertyTypes")
      saveProperties(
        loadProperties().map((property) =>
          property.propertyType === oldLabel
            ? { ...property, propertyType: replacement as PropertyType }
            : property,
        ),
      );
    if (key === "propertyStatuses")
      saveProperties(
        loadProperties().map((property) =>
          property.status === oldLabel
            ? { ...property, status: replacement as PropertyStatus }
            : property,
        ),
      );
    if (key === "clientStatuses")
      saveClients(
        loadClients().map((client) =>
          client.stage === oldLabel
            ? { ...client, stage: replacement as ClientStage }
            : client,
        ),
      );
  }
  const exportBackup = async () => {
    const completeBackup = await createCompleteBackup();
    const blob = new Blob([JSON.stringify(completeBackup, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `estateflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const readBackup = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!validateBackup(parsed)) {
        setMessage("Unsupported or malformed backup. No data was changed.");
        return;
      }
      setBackup(parsed);
      setMessage(
        `Valid backup from ${parsed.createdAt}. Choose Merge or Replace.`,
      );
    } catch {
      setMessage("Backup file could not be read. No data was changed.");
    }
  };
  return (
    <DashboardShell>
      <section>
        <p className="text-sm font-bold text-amber-700">PREFERENCES & DATA</p>
        <h1 className="mt-2 text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-slate-600">
          Agency defaults, localization, appearance, custom lists, and safe
          local backup.
        </p>
      </section>
      <div className="mt-6 flex gap-2 overflow-x-auto">
        {[
          "Agency",
          "Localization",
          "Defaults",
          "Custom lists",
          "Appearance",
          "Data",
        ].map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={`min-h-11 shrink-0 rounded-xl px-4 font-bold ${tab === x ? "bg-slate-950 text-white" : "bg-white"}`}
          >
            {x}
          </button>
        ))}
      </div>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800"
        >
          {message}
        </p>
      )}
      <section className="mt-5 rounded-2xl border bg-white p-5 sm:p-6">
        {tab === "Agency" && (
          <div>
            <Grid>
            <Field
              label="Agency name"
              value={agencyDraft.agencyName}
              set={(v) => patchAgency({ agencyName: v })}
            />
            <Field
              label="Logo URL or data URL"
              value={agencyDraft.logo}
              set={(v) => patchAgency({ logo: v })}
            />
            <Field
              label="Phone"
              value={agencyDraft.phone}
              set={(v) => patchAgency({ phone: v })}
            />
            <Field
              label="WhatsApp"
              value={agencyDraft.whatsapp}
              set={(v) => patchAgency({ whatsapp: v })}
            />
            <Field
              label="Email"
              value={agencyDraft.email}
              set={(v) => patchAgency({ email: v })}
            />
            <Field
              label="Address"
              value={agencyDraft.address}
              set={(v) => patchAgency({ address: v })}
            />
            <Field
              label="Website"
              value={agencyDraft.website}
              set={(v) => patchAgency({ website: v })}
            />
            <Field
              label="Registration / tax"
              value={agencyDraft.registrationInfo}
              set={(v) => patchAgency({ registrationInfo: v })}
            />
            <Field
              label="Contract footer"
              value={agencyDraft.contractFooter}
              set={(v) => patchAgency({ contractFooter: v })}
            />
            <Field
              label="Default responsible agent"
              value={agencyDraft.defaultResponsibleAgent}
              set={(v) => patchAgency({ defaultResponsibleAgent: v })}
            />
            </Grid>
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Save your agency identity to apply it across the workspace.
              </p>
              <button
                type="button"
                onClick={saveAgency}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-6 font-bold text-white transition hover:bg-slate-800"
              >
                Save agency settings
              </button>
            </div>
          </div>
        )}
        {tab === "Localization" && (
          <Grid>
            <Select
              label="Default currency"
              value={settings.defaultCurrency}
              options={["USD", "IQD"]}
              set={(v) => patch({ defaultCurrency: v as "USD" | "IQD" })}
            />
            <Field
              label="Date format"
              value={settings.dateFormat}
              set={(v) => patch({ dateFormat: v })}
            />
            <Select
              label="Time format"
              value={settings.timeFormat}
              options={["12h", "24h"]}
              set={(v) => patch({ timeFormat: v as "12h" | "24h" })}
            />
            <Field
              label="Number format"
              value={settings.numberFormat}
              set={(v) => patch({ numberFormat: v })}
            />
            <Field
              label="Language preparation"
              value={settings.language}
              set={(v) => patch({ language: v })}
            />
            <Field
              label="Time zone"
              value={settings.timeZone}
              set={(v) => patch({ timeZone: v })}
            />
          </Grid>
        )}
        {tab === "Defaults" && (
          <Grid>
            <Select
              label="Commission type"
              value={settings.commissionType}
              options={["Percentage", "Fixed"]}
              set={(v) =>
                patch({ commissionType: v as "Percentage" | "Fixed" })
              }
            />
            <NumberField
              label="Commission value"
              value={settings.commissionValue}
              set={(v) => patch({ commissionValue: v })}
            />
            <NumberField
              label="Agent share %"
              value={settings.agentShare}
              set={(v) => patch({ agentShare: v })}
            />
            <NumberField
              label="Offer expiration days"
              value={settings.offerExpirationDays}
              set={(v) => patch({ offerExpirationDays: v })}
            />
            <NumberField
              label="Viewing reminder hours"
              value={settings.viewingReminderHours}
              set={(v) => patch({ viewingReminderHours: v })}
            />
            <NumberField
              label="Payment reminder days"
              value={settings.paymentReminderDays}
              set={(v) => patch({ paymentReminderDays: v })}
            />
            <Field
              label="Contract prefix"
              value={settings.contractPrefix}
              set={(v) => patch({ contractPrefix: v })}
            />
            <Field
              label="Property prefix"
              value={settings.propertyPrefix}
              set={(v) => patch({ propertyPrefix: v })}
            />
          </Grid>
        )}
        {tab === "Custom lists" && (
          <div className="space-y-5">
            {Object.entries(settings.customLists).map(([key, options]) => (
              <CustomList
                key={key}
                title={key}
                options={options}
                onChange={(next) =>
                  patch({
                    customLists: { ...settings.customLists, [key]: next },
                  })
                }
                onDelete={(id) => {
                  const target = options.find((option) => option.id === id);
                  if (!target) return;
                  const used = usedLabelsFor(key);
                  let result = deleteCustomOption(options, id, used);
                  if (!result.ok) {
                    const replacement = window.prompt(
                      result.message,
                      options.find(
                        (option) => option.id !== id && !option.archived,
                      )?.label ?? "",
                    );
                    if (!replacement?.trim()) return;
                    replaceUsedOption(key, target.label, replacement.trim());
                    result = deleteCustomOption(
                      options,
                      id,
                      used,
                      replacement.trim(),
                    );
                  }
                  if (result.ok)
                    patch({
                      customLists: {
                        ...settings.customLists,
                        [key]: result.options,
                      },
                    });
                }}
              />
            ))}
          </div>
        )}
        {tab === "Appearance" && (
          <Grid>
            <Select
              label="Theme"
              value={settings.theme}
              options={["light", "dark"]}
              set={(v) => patch({ theme: v as "light" | "dark" })}
            />
            <Select
              label="Density"
              value={settings.density}
              options={["comfortable", "compact"]}
              set={(v) => patch({ density: v as "comfortable" | "compact" })}
            />
            <label className="flex min-h-12 items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => patch({ sidebarCollapsed: e.target.checked })}
              />{" "}
              Collapse desktop sidebar
            </label>
          </Grid>
        )}
        {tab === "Data" && (
          <div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportBackup}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 font-bold text-white"
              >
                <Download size={17} /> Export JSON backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => readBackup(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 font-bold"
              >
                <Upload size={17} /> Import backup
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Restore default settings? Saved business records will not be erased.",
                    )
                  )
                    save(structuredClone(defaultSettings));
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 font-bold"
              >
                <RotateCcw size={17} /> Restore settings
              </button>
            </div>
            {backup && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold">Backup preview</p>
                <p className="mt-1 text-sm">
                  {Object.keys(backup.localStorage).length} EstateFlow data
                  collections · {backup.createdAt}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      void applyCompleteBackup(backup, "merge");
                      setMessage(
                        "Backup merged. Refresh to reload all workspaces.",
                      );
                    }}
                    className="min-h-11 rounded-xl border bg-white px-4 font-bold"
                  >
                    Merge
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Replace all current EstateFlow local data with this backup?",
                        )
                      ) {
                        void applyCompleteBackup(backup, "replace");
                        setMessage("Backup replaced. Refresh to reload.");
                      }
                    }}
                    className="min-h-11 rounded-xl bg-rose-600 px-4 font-bold text-white"
                  >
                    Replace
                  </button>
                </div>
              </div>
            )}
            <p className="mt-5 text-sm text-slate-500">
              The JSON backup includes EstateFlow localStorage collections and
              IndexedDB document files when the browser can read them.
            </p>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Field({
  label,
  value,
  set,
}: {
  label: string;
  value: string;
  set: (v: string) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`mt-2 ${input}`}
      />
    </label>
  );
}
function NumberField({
  label,
  value,
  set,
}: {
  label: string;
  value: number;
  set: (v: number) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => set(Math.max(0, Number(e.target.value)))}
        className={`mt-2 ${input}`}
      />
    </label>
  );
}
function Select({
  label,
  value,
  options,
  set,
}: {
  label: string;
  value: string;
  options: string[];
  set: (v: string) => void;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`mt-2 ${input}`}
      >
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function CustomList({
  title,
  options,
  onChange,
  onDelete,
}: {
  title: string;
  options: AppSettings["customLists"][string];
  onChange: (v: AppSettings["customLists"][string]) => void;
  onDelete: (id: string) => void;
}) {
  const [value, setValue] = useState("");
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (
      !value.trim() ||
      options.some((x) => x.label.toLowerCase() === value.trim().toLowerCase())
    )
      return;
    onChange([
      ...options,
      {
        id: `OPT-${new Date().toISOString().replace(/\D/g, "")}`,
        label: value.trim(),
        archived: false,
      },
    ]);
    setValue("");
  };
  return (
    <div>
      <h2 className="font-bold capitalize">
        {title.replace(/([A-Z])/g, " $1")}
      </h2>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={input}
          placeholder="Add option"
        />
        <button className="rounded-xl bg-amber-500 px-4 font-bold">Add</button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <span
            key={o.id}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm"
          >
            <button
              onClick={() => {
                const label = window.prompt("Rename option", o.label);
                if (label?.trim())
                  onChange(
                    options.map((x) =>
                      x.id === o.id ? { ...x, label: label.trim() } : x,
                    ),
                  );
              }}
            >
              {o.label}
            </button>
            <button
              aria-label={`Move ${o.label} earlier`}
              disabled={i === 0}
              onClick={() => {
                const next = [...options];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              ↑
            </button>
            <button
              onClick={() =>
                onChange(
                  options.map((x) =>
                    x.id === o.id ? { ...x, archived: !x.archived } : x,
                  ),
                )
              }
            >
              {o.archived ? "Restore" : "Archive"}
            </button>
            <button onClick={() => onDelete(o.id)} className="text-rose-600">
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
