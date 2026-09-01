import type { UserRole } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";

export const authorize = (...roles: UserRole[]): RequestHandler => {
  const allowedRoles = new Set(roles);

  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!allowedRoles.has(req.user.role)) {
      next(new AppError("Insufficient permissions", 403));
      return;
    }

    next();
  };
};
