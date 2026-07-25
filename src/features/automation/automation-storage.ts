import { defaultAutomationRules, type AutomationRule } from "./automation-data";
const KEY = "estateflow-automations";
export function loadAutomationRules(): AutomationRule[] {
  try {
    const p: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (!Array.isArray(p)) return structuredClone(defaultAutomationRules);
    return defaultAutomationRules.map((d) => ({
      ...d,
      ...(p.find(
        (x) =>
          typeof x === "object" &&
          x !== null &&
          (x as AutomationRule).id === d.id,
      ) ?? {}),
    }));
  } catch {
    return structuredClone(defaultAutomationRules);
  }
}
export function saveAutomationRules(v: readonly AutomationRule[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
