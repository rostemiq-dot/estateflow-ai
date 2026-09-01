import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import "./types/express.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { authRouter } from "./modules/auth/routes/auth.routes.js";
import {
  clientRouter,
  clientTagRouter,
} from "./modules/clients/routes/client.routes.js";
import { dealRouter } from "./modules/deals/routes/deal.routes.js";
import { viewingRouter } from "./modules/viewings/routes/viewing.routes.js";
import { propertyRouter } from "./modules/properties/routes/property.routes.js";
import {
  amenityRouter,
  mediaRouter,
  propertyTagRouter,
} from "./modules/property-metadata/routes/metadata.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(pinoHttp({ logger }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/properties", propertyRouter);
app.use("/api/properties", mediaRouter);
app.use("/api/property-metadata/amenities", amenityRouter);
app.use("/api/property-metadata/tags", propertyTagRouter);
app.use("/api/clients", clientRouter);
app.use("/api/clients", clientTagRouter);
app.use("/api/deals", dealRouter);
app.use("/api/viewings", viewingRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
