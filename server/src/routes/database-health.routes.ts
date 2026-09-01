import type { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

type DatabaseHealthClient = Pick<PrismaClient, "$queryRaw">;

export const createDatabaseHealthRouter = (
  databaseClient: DatabaseHealthClient = prisma,
) => {
  const router = Router();

  router.get("/", async (_req, res) => {
    const timestamp = new Date().toISOString();

    try {
      await databaseClient.$queryRaw`SELECT 1`;

      res.status(200).json({
        success: true,
        status: "healthy",
        service: "estateflow-database",
        timestamp,
      });
    } catch (error) {
      logger.error(
        {
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Database health check failed",
      );

      res.status(503).json({
        success: false,
        status: "unhealthy",
        service: "estateflow-database",
        timestamp,
        error: {
          message: "Database connection unavailable",
          statusCode: 503,
        },
      });
    }
  });

  return router;
};

export const databaseHealthRouter = createDatabaseHealthRouter();
