import {
  defaultSettings,
  type AppSettings,
  type CustomOption,
} from "./settings-data";
export const SETTINGS_KEY = "estateflow-settings";
export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return structuredClone(defaultSettings);
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(defaultSettings);
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null)
      return structuredClone(defaultSettings);
    const saved = value as Partial<AppSettings>;
    return {
      ...structuredClone(defaultSettings),
      ...saved,
      customLists: {
        ...structuredClone(defaultSettings.customLists),
        ...(saved.customLists ?? {}),
      },
    };
  } catch {
    return structuredClone(defaultSettings);
  }
}
export function saveSettings(v: AppSettings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(v));
    document.documentElement.dataset.theme = v.theme;
    document.documentElement.dataset.density = v.density;
    return true;
  } catch {
    return false;
  }
}
export function migrateCustomList(
  values: readonly string[],
  existing: readonly CustomOption[],
) {
  const labels = new Set(existing.map((x) => x.label.toLowerCase()));
  return [
    ...existing,
    ...values
      .filter((v) => !labels.has(v.toLowerCase()))
      .map((label, i) => ({
        id: `migrated-${Date.now()}-${i}`,
        label,
        archived: false,
      })),
  ];
}
export function deleteCustomOption(
  options: readonly CustomOption[],
  id: string,
  usedLabels: readonly string[],
  replacement?: string,
) {
  const target = options.find((x) => x.id === id);
  if (!target) return { ok: false as const, message: "Option not found." };
  if (usedLabels.includes(target.label) && !replacement)
    return {
      ok: false as const,
      message:
        "Choose a replacement before deleting an option used by saved records.",
    };
  return {
    ok: true as const,
    options: options.filter((x) => x.id !== id),
    replacement,
  };
}
