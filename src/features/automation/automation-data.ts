export const AUTOMATION_IDS = [
  "viewing-reminder",
  "offer-expiration",
  "accepted-offer",
  "payment-due",
  "contract-signing",
  "overdue-tasks",
  "client-followup",
] as const;
export type AutomationId = (typeof AUTOMATION_IDS)[number];
export type AutomationRule = {
  id: AutomationId;
  name: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  leadTime: number;
  leadUnit: "hours" | "days";
  lastEvaluatedAt: string;
  createdCount: number;
  history: { id: string; text: string; createdAt: string }[];
};
export const defaultAutomationRules: AutomationRule[] = [
  [
    "viewing-reminder",
    "Viewing reminders",
    "A preparation task before a scheduled viewing.",
    "Viewing scheduled",
    "Create reminder task",
    24,
    "hours",
  ],
  [
    "offer-expiration",
    "Offer expiration follow-ups",
    "Follow up before a sent offer expires.",
    "Offer sent",
    "Create follow-up task",
    1,
    "days",
  ],
  [
    "accepted-offer",
    "Contract preparation",
    "Prepare a contract after an offer is accepted.",
    "Offer accepted",
    "Create contract task",
    1,
    "days",
  ],
  [
    "payment-due",
    "Payment due reminders",
    "Collect upcoming scheduled payments.",
    "Payment due",
    "Create collection task",
    1,
    "days",
  ],
  [
    "contract-signing",
    "Contract signing follow-ups",
    "Arrange signing when a contract is ready.",
    "Ready to Sign",
    "Create signing task",
    1,
    "days",
  ],
  [
    "overdue-tasks",
    "Overdue task notifications",
    "Surface overdue saved tasks.",
    "Task overdue",
    "Create notification",
    0,
    "days",
  ],
  [
    "client-followup",
    "Client follow-up reminders",
    "Surface saved client follow-up dates.",
    "Client follow-up due",
    "Create reminder",
    1,
    "days",
  ],
].map(([id, name, description, trigger, action, leadTime, leadUnit]) => ({
  id: id as AutomationId,
  name: String(name),
  description: String(description),
  trigger: String(trigger),
  action: String(action),
  enabled: true,
  leadTime: Number(leadTime),
  leadUnit: leadUnit as "hours" | "days",
  lastEvaluatedAt: "",
  createdCount: 0,
  history: [],
}));
