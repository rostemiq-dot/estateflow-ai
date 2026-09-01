import { ViewingStatus } from "@prisma/client";
import { AppError } from "../../../errors/app-error.js";

export const allowedViewingTransitions: Readonly<
  Record<ViewingStatus, readonly ViewingStatus[]>
> = {
  [ViewingStatus.SCHEDULED]: [
    ViewingStatus.CONFIRMED,
    ViewingStatus.RESCHEDULED,
    ViewingStatus.COMPLETED,
    ViewingStatus.CANCELLED,
    ViewingStatus.NO_SHOW,
  ],
  [ViewingStatus.CONFIRMED]: [
    ViewingStatus.RESCHEDULED,
    ViewingStatus.COMPLETED,
    ViewingStatus.CANCELLED,
    ViewingStatus.NO_SHOW,
  ],
  [ViewingStatus.RESCHEDULED]: [
    ViewingStatus.CONFIRMED,
    ViewingStatus.COMPLETED,
    ViewingStatus.CANCELLED,
    ViewingStatus.NO_SHOW,
  ],
  [ViewingStatus.COMPLETED]: [],
  [ViewingStatus.CANCELLED]: [],
  [ViewingStatus.NO_SHOW]: [],
};

export const assertViewingTransition = (
  from: ViewingStatus,
  to: ViewingStatus,
) => {
  if (from === to) return;
  if (!allowedViewingTransitions[from].includes(to)) {
    throw new AppError(
      `Viewing status cannot transition from ${from} to ${to}`,
      409,
    );
  }
};
