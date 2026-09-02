import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

let isShuttingDown = false;

const shutdown = (signal: string, exitCode = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down EstateFlow API");

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing HTTP server");
      process.exit(1);
    }

    logger.info("HTTP server closed");
    process.exit(exitCode);
  });

  setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, 10_000).unref();
};

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(
    { environment: env.NODE_ENV, host: "0.0.0.0", port: env.PORT },
    "EstateFlow API is running",
  );
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException", 1);
});