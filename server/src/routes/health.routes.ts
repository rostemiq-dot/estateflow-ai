import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "estateflow-api",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});
