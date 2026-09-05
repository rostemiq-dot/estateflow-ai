import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import "./types/express.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import {
  clientRouter,
  clientTagRouter,
} from "./modules/clients/routes/client.routes.js";
import { dealRouter } from "./modules/deals/routes/deal.routes.js";
import { viewingRouter } from "./modules/viewings/routes/viewing.routes.js";
import { propertyRouter } from "./modules/properties/routes/property.routes.js";
import { workflowRouter } from "./modules/workflow/workflow.routes.js";
import {
  amenityRouter,
  mediaRouter,
  tagRouter,
} from "./modules/property-metadata/routes/metadata.routes.js";
import { publicPropertyRouter } from "./routes/public-properties.routes.js";
import { databaseHealthRouter } from "./routes/database-health.routes.js";
import { healthRouter } from "./routes/health.routes.js";

const allowedOrigins = new Set([
  env.CLIENT_URL,
  "https://estateflow-ai-self.vercel.app",
]);

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("CORS origin not allowed"));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp({ logger }));

  // Public, read-only property portal. It intentionally sits outside the
  // authenticated CRM routes and exposes only AVAILABLE properties.
  app.use("/api/public/properties", publicPropertyRouter);

  app.use("/api/clients", clientRouter);
  app.use("/api/client-tags", clientTagRouter);
  app.use("/api/deals", dealRouter);
  app.use("/api/viewings", viewingRouter);
  app.use("/api/properties", propertyRouter);
  app.use("/api/properties/:propertyId/media", mediaRouter);
  app.use("/api/amenities", amenityRouter);
  app.use("/api/tags", tagRouter);
  app.use("/api/workflow", workflowRouter);
  app.use("/api/health/database", databaseHealthRouter);
  app.use("/api/health", healthRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export const app = createApp();