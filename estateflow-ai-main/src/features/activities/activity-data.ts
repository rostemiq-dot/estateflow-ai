export const ACTIVITY_TYPES = [
  "Call",
  "WhatsApp",
  "Meeting",
  "General",
  "Viewing",
  "Outcome",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Activity = {
  id: string;
  clientId: string;
  propertyId?: string;
  viewingId?: string;
  type: ActivityType;
  text: string;
  createdAt: string;
};

export type ActivityDraft = Pick<Activity, "clientId" | "type" | "text"> &
  Partial<Pick<Activity, "propertyId" | "viewingId" | "createdAt">>;
