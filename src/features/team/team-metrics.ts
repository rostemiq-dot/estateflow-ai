import type { Contract } from "../contracts/contract-data";
import type { Deal } from "../deals/deal-data";
import {
  calculateCommission,
  getCommissionBase,
  isClosedStage,
} from "../deals/deal-utils";
import type { Task } from "../tasks/task-data";
import { taskTiming } from "../tasks/task-storage";
import type { TeamMember } from "./team-data";
export function getMemberPerformance(
  member: TeamMember,
  deals: readonly Deal[],
  contracts: readonly Contract[],
  tasks: readonly Task[],
) {
  const assignedDeals = deals.filter(
    (d) => d.assignedAgent === member.fullName,
  );
  const assignedTasks = tasks.filter(
    (t) => t.responsibleAgent === member.fullName,
  );
  const sums = (currency: "USD" | "IQD") => {
    const currencyDeals = assignedDeals.filter((d) => d.currency === currency);
    return {
      pipelineMinor: currencyDeals
        .filter((d) => !isClosedStage(d.stage))
        .reduce((n, d) => n + d.expectedValueMinor, 0),
      expectedCommissionMinor: currencyDeals
        .filter((d) => !isClosedStage(d.stage))
        .reduce(
          (n, d) =>
            n +
            calculateCommission(getCommissionBase(d), d.commission).agencyMinor,
          0,
        ),
      confirmedCommissionMinor: currencyDeals
        .filter((d) => d.commission.confirmed)
        .reduce(
          (n, d) =>
            n +
            calculateCommission(getCommissionBase(d), d.commission).agencyMinor,
          0,
        ),
    };
  };
  return {
    activeDeals: assignedDeals.filter((d) => !isClosedStage(d.stage)).length,
    wonDeals: assignedDeals.filter((d) => d.stage === "Closed Won").length,
    completedTasks: assignedTasks.filter((t) => t.status === "Completed")
      .length,
    overdueTasks: assignedTasks.filter((t) => taskTiming(t).overdue).length,
    contracts: contracts.filter((c) => c.responsibleAgent === member.fullName)
      .length,
    USD: sums("USD"),
    IQD: sums("IQD"),
  };
}
