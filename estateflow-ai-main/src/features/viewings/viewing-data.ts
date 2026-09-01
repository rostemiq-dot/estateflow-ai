export const VIEWING_STATUSES = [
  "Scheduled",
  "Confirmed",
  "Completed",
  "Cancelled",
] as const;

export const VIEWING_OUTCOMES = [
  "Interested",
  "Considering",
  "Not interested",
  "Offer made",
] as const;

export type ViewingStatus = (typeof VIEWING_STATUSES)[number];
export type ViewingOutcome = (typeof VIEWING_OUTCOMES)[number];

export type Viewing = {
  id: string;
  clientId: string;
  propertyId: string;
  date: string;
  time: string;
  location: string;
  status: ViewingStatus;
  outcome?: ViewingOutcome;
  outcomeNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ViewingDraft = Pick<
  Viewing,
  "clientId" | "propertyId" | "date" | "time" | "location"
>;
