// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clients } from "../clients/client-data";
import { properties } from "../properties/property-data";
import { createDeal } from "../deals/deal-storage";
import type { Task } from "../tasks/task-data";
import { getMemberPerformance } from "./team-metrics";
import { createTeamMember, loadTeam, saveTeam } from "./team-storage";
describe("team management", () => {
  beforeEach(() => window.localStorage.clear());
  it("seeds only one owner and persists CRUD safely", () => {
    expect(loadTeam()).toHaveLength(1);
    const draft = {
      fullName: "Dilan Agent",
      photo: "",
      jobTitle: "Sales Agent",
      phone: "1",
      email: "dilan@example.com",
      role: "Agent" as const,
      status: "Active" as const,
      joiningDate: "2026-07-01",
      commissionRateBasisPoints: 250,
      notes: "",
      archived: false,
    };
    const created = createTeamMember(draft, loadTeam());
    expect(created).not.toBeNull();
    if (!created) return;
    saveTeam([...loadTeam(), created]);
    expect(loadTeam().some((x) => x.email === draft.email)).toBe(true);
    expect(createTeamMember(draft, loadTeam())).toBeNull();
    saveTeam(loadTeam().filter((x) => x.id !== created.id));
    expect(loadTeam()).toHaveLength(1);
  });
  it("calculates assignments and real performance by preserved agent name", () => {
    const member = { ...loadTeam()[0], fullName: "Mohammed" };
    const deal = createDeal(
      {
        title: "Assigned",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Closed Won",
        expectedValueMinor: 100000,
        currency: "USD",
        probability: 100,
        assignedAgent: "Mohammed",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    deal.commission.confirmed = true;
    const task: Task = {
      id: "T",
      automatic: false,
      title: "Done",
      description: "",
      dueAt: "2026-07-01T10:00",
      priority: "Normal",
      status: "Completed",
      responsibleAgent: "Mohammed",
      notes: "",
      archived: false,
      history: [],
      createdAt: "",
      updatedAt: "",
    };
    const metrics = getMemberPerformance(member, [deal], [], [task]);
    expect(metrics.wonDeals).toBe(1);
    expect(metrics.completedTasks).toBe(1);
    expect(metrics.USD.confirmedCommissionMinor).toBeGreaterThan(0);
  });
});
