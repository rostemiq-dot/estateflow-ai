export const TEAM_ROLES = [
  "Owner",
  "Manager",
  "Agent",
  "Assistant",
  "Accountant",
] as const;
export const TEAM_STATUSES = ["Active", "Away", "Inactive"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];
export type TeamMember = {
  id: string;
  fullName: string;
  photo: string;
  jobTitle: string;
  phone: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  joiningDate: string;
  commissionRateBasisPoints: number;
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};
