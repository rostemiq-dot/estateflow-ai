import { Router } from "express";
import { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { createAuthenticate } from "../auth/middleware/authenticate.js";
import { authorize } from "../auth/middleware/authorize.js";
import { AppError } from "../../errors/app-error.js";

export const teamRouter = Router();
teamRouter.use(createAuthenticate());
teamRouter.get("/", authorize(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError("Authentication required", 401);
    const users = await prisma.user.findMany({
      where: { agencyId: req.user.agencyId },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});
