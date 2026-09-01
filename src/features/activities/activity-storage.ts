import {
  ACTIVITY_TYPES,
  type Activity,
  type ActivityDraft,
  type ActivityType,
} from "./activity-data";

const ACTIVITY_STORAGE_KEY = "estateflow-activities";
const LEGACY_NOTES_STORAGE_KEY = "estateflow-client-notes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isActivityType(value: unknown): value is ActivityType {
  return (
    typeof value === "string" && ACTIVITY_TYPES.includes(value as ActivityType)
  );
}

function normalizeActivity(value: unknown): Activity | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id : "";
  const clientId = typeof value.clientId === "string" ? value.clientId : "";
  const text = typeof value.text === "string" ? value.text.trim() : "";
  const createdAt =
    typeof value.createdAt === "string" &&
    !Number.isNaN(Date.parse(value.createdAt))
      ? value.createdAt
      : new Date().toISOString();

  if (!id || !clientId || !text || !isActivityType(value.type)) {
    return null;
  }

  return {
    id,
    clientId,
    propertyId:
      typeof value.propertyId === "string" ? value.propertyId : undefined,
    viewingId:
      typeof value.viewingId === "string" ? value.viewingId : undefined,
    type: value.type,
    text,
    createdAt,
  };
}

function loadLegacyNotes(): Activity[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedNotes = window.localStorage.getItem(LEGACY_NOTES_STORAGE_KEY);

    if (!savedNotes) {
      return [];
    }

    const parsedNotes: unknown = JSON.parse(savedNotes);

    if (!isRecord(parsedNotes)) {
      return [];
    }

    return Object.entries(parsedNotes).flatMap(([clientId, notes]) => {
      if (!Array.isArray(notes)) {
        return [];
      }

      return notes
        .map((note) => {
          if (!isRecord(note)) {
            return null;
          }

          return normalizeActivity({
            ...note,
            clientId,
          });
        })
        .filter((activity): activity is Activity => activity !== null);
    });
  } catch {
    return [];
  }
}

export function loadActivities(): Activity[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedActivities = window.localStorage.getItem(ACTIVITY_STORAGE_KEY);

    if (savedActivities === null) {
      return loadLegacyNotes();
    }

    const parsedActivities: unknown = JSON.parse(savedActivities);

    if (!Array.isArray(parsedActivities)) {
      return [];
    }

    return parsedActivities
      .map(normalizeActivity)
      .filter((activity): activity is Activity => activity !== null);
  } catch {
    return [];
  }
}

export function saveActivities(activities: readonly Activity[]) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      ACTIVITY_STORAGE_KEY,
      JSON.stringify(activities),
    );
    return true;
  } catch {
    return false;
  }
}

export function createActivity(draft: ActivityDraft): Activity {
  return {
    ...draft,
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: draft.text.trim(),
    createdAt: draft.createdAt ?? new Date().toISOString(),
  };
}

export function getActivitiesForClient(
  activities: readonly Activity[],
  clientId: string,
) {
  return activities
    .filter((activity) => activity.clientId === clientId)
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
}

export function getActivitiesForProperty(
  activities: readonly Activity[],
  propertyId: string,
) {
  return activities
    .filter((activity) => activity.propertyId === propertyId)
    .sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
}
