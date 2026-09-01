import { Download, RotateCcw, Upload, Save } from "lucide-react";
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

const input =
  "min-h-12 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

export function SettingsPage() {
  const [formData, setFormData] = useState<AppSettings>(loadSettings);
  const [tab, setTab] = useState("Agency");
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<EstateFlowBackup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveAll = (e?: FormEvent) => {
    if (e) e.preventDefault();
    saveSettings(formData);
    
    if (formData.agencyName) {
      document.title = `${formData.agencyName} - Real Estate OS`;
    }
    
    window.dispatchEvent(new Event("estateflow_settings_updated"));

    setMessage("Settings saved successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const patchForm = (p: Partial<AppSettings>) => {
    setFormData((prev) => ({ ...prev, ...p }));
  };

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-2 sm:p-4 rounded-2xl transition-colors">
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
              PREFERENCES & DATA
            </p>
            <h1 className="mt-1 text-3xl font-bold">Settings</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Agency defaults, localization, appearance, custom lists, and safe local backup.
            </p>
          </div>
          <button
            onClick={() => handleSaveAll()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md transition-all shrink-0"
          >
            <Save size={18} /> Save Changes
          </button>
        </section>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
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
              className={`min-h-11 shrink-0 rounded-xl px-4 font-bold transition-colors ${
                tab === x
                  ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {x}
            </button>
          ))}
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-amber-100 dark:bg-amber-950/80 p-4 text-sm font-semibold text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800"
          >
            {message}
          </p>
        )}

        <form onSubmit={handleSaveAll} className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 p-5 sm:p-6 shadow-sm">
          {tab === "Agency" && (
            <div className="space-y-6">
              <Grid>
                <Field
                  label="Agency name"
                  value={formData.agencyName}
                  set={(v) => patchForm({ agencyName: v })}
                />
                <Field
                  label="Logo URL or data URL"
                  value={formData.logo}
                  set={(v) => patchForm({ logo: v })}
                />
                <Field
                  label="Phone"
                  value={formData.phone}
                  set={(v) => patchForm({ phone: v })}
                />
                <Field
                  label="WhatsApp"
                  value={formData.whatsapp}
                  set={(v) => patchForm({ whatsapp: v })}
                />
                <Field
                  label="Email"
                  value={formData.email}
                  set={(v) => patchForm({ email: v })}
                />
                <Field
                  label="Address"
                  value={formData.address}
                  set={(v) => patchForm({ address: v })}
                />
                <Field
                  label="Website"
                  value={formData.website}
                  set={(v) => patchForm({ website: v })}
                />
                <Field
                  label="Registration / tax"
                  value={formData.registrationInfo}
                  set={(v) => patchForm({ registrationInfo: v })}
                />
                <Field
                  label="Contract footer"
                  value={formData.contractFooter}
                  set={(v) => patchForm({ contractFooter: v })}
                />
                <Field
                  label="Default responsible agent"
                  value={formData.defaultResponsibleAgent}
                  set={(v) => patchForm({ defaultResponsibleAgent: v })}
                />
              </Grid>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  <Save size={18} /> Save Agency Details
                </button>
              </div>
            </div>
          )}

          {tab === "Localization" && (
            <Grid>
              <Select
                label="Default currency"
                value={formData.defaultCurrency}
                options={["USD", "IQD"]}
                set={(v) => patchForm({ defaultCurrency: v as "USD" | "IQD" })}
              />
              <Field
                label="Date format"
                value={formData.dateFormat}
                set={(v) => patchForm({ dateFormat: v })}
              />
              <Select
                label="Time format"
                value={formData.timeFormat}
                options={["12h", "24h"]}
                set={(v) => patchForm({ timeFormat: v as "12h" | "24h" })}
              />
              <Field
                label="Number format"
                value={formData.numberFormat}
                set={(v) => patchForm({ numberFormat: v })}
              />
              <Field
                label="Language preparation"
                value={formData.language}
                set={(v) => patchForm({ language: v })}
              />
              <Field
                label="Time zone"
                value={formData.timeZone}
                set={(v) => patchForm({ timeZone: v })}
              />
            </Grid>
          )}

          {tab === "Defaults" && (
            <Grid>
              <Select
                label="Commission type"
                value={formData.commissionType}
                options={["Percentage", "Fixed"]}
                set={(v) =>
                  patchForm({ commissionType: v as "Percentage" | "Fixed" })
                }
              />
              <NumberField
                label="Commission value"
                value={formData.commissionValue}
                set={(v) => patchForm({ commissionValue: v })}
              />
              <NumberField
                label="Agent share %"
                value={formData.agentShare}
                set={(v) => patchForm({ agentShare: v })}
              />
              <NumberField
                label="Offer expiration days"
                value={formData.offerExpirationDays}
                set={(v) => patchForm({ offerExpirationDays: v })}
              />
              <NumberField
                label="Viewing reminder hours"
                value={formData.viewingReminderHours}
                set={(v) => patchForm({ viewingReminderHours: v })}
              />
              <NumberField
                label="Payment reminder days"
                value={formData.paymentReminderDays}
                set={(v) => patchForm({ paymentReminderDays: v })}
              />
              <Field
                label="Contract prefix"
                value={formData.contractPrefix}
                set={(v) => patchForm({ contractPrefix: v })}
              />
              <Field
                label="Property prefix"
                value={formData.propertyPrefix}
                set={(v) => patchForm({ propertyPrefix: v })}
              />
            </Grid>
          )}

          {tab === "Custom lists" && (
            <div className="space-y-5">
              {Object.entries(formData.customLists).map(([key, options]) => (
                <CustomList
                  key={key}
                  title={key}
                  options={options}
                  onChange={(next) =>
                    patchForm({
                      customLists: { ...formData.customLists, [key]: next },
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
                      patchForm({
                        customLists: {
                          ...formData.customLists,
                          [key]: result.options,
                        },
                      });
                  }}
                />
              ))}
            </div>
          )}

          {tab === "Appearance" && (
            <div className="space-y-6">
              <Grid>
                <Select
                  label="Theme"
                  value={formData.theme}
                  options={["light", "dark"]}
                  set={(v) => patchForm({ theme: v as "light" | "dark" })}
                />
                <Select
                  label="Density"
                  value={formData.density}
                  options={["comfortable", "compact"]}
                  set={(v) => patchForm({ density: v as "comfortable" | "compact" })}
                />
                <label className="flex min-h-12 items-center gap-3 font-bold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.sidebarCollapsed}
                    onChange={(e) => patchForm({ sidebarCollapsed: e.target.checked })}
                    className="h-4 w-4 rounded accent-amber-500"
                  />{" "}
                  Collapse desktop sidebar
                </label>
              </Grid>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  <Save size={18} /> Apply Theme Changes
                </button>
              </div>
            </div>
          )}

          {tab === "Data" && (
            <div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportBackup}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900 px-5 font-bold hover:opacity-90"
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
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 font-bold"
                >
                  <Upload size={17} /> Import backup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Restore default settings? Saved business records will not be erased.",
                      )
                    ) {
                      saveSettings(structuredClone(defaultSettings));
                      setFormData(structuredClone(defaultSettings));
                    }
                  }}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 font-bold"
                >
                  <RotateCcw size={17} /> Restore settings
                </button>
              </div>

              {backup && (
                <div className="mt-5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
                  <p className="font-bold text-amber-900 dark:text-amber-100">Backup preview</p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    {Object.keys(backup.localStorage).length} EstateFlow data
                    collections · {backup.createdAt}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void applyCompleteBackup(backup, "merge");
                        setMessage(
                          "Backup merged. Refresh to reload all workspaces.",
                        );
                      }}
                      className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 font-bold"
                    >
                      Merge
                    </button>
                    <button
                      type="button"
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
                      className="min-h-11 rounded-xl bg-rose-600 px-4 font-bold text-white hover:bg-rose-700"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
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
    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <input
        value={value ?? ""}
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
    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <input
        type="number"
        min="0"
        value={value ?? 0}
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
    <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
      {label}
      <select
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`mt-2 ${input}`}
      >
        {options.map((x) => (
          <option key={x} value={x} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {x}
          </option>
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
      <h2 className="font-bold capitalize text-slate-800 dark:text-slate-200">
        {title.replace(/([A-Z])/g, " $1")}
      </h2>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={input}
          placeholder="Add option"
        />
        <button type="submit" className="rounded-xl bg-amber-500 hover:bg-amber-600 px-4 font-bold text-slate-950">
          Add
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <span
            key={o.id}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-700/80 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
          >
            <button
              type="button"
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
              type="button"
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
              type="button"
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
            <button type="button" onClick={() => onDelete(o.id)} className="text-rose-600 dark:text-rose-400">
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}