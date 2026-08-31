import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { AppError } from "../errors/app-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError =
    error instanceof AppError
      ? error
      : new AppError("Internal server error", 500, false);

  const log =
    appError.statusCode >= 500
      ? logger.error.bind(logger)
      : logger.warn.bind(logger);
  log(
    {
      err: error,
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
    },
    appError.message,
  );

  res.status(appError.statusCode).json({
    success: false,
    error: {
      message: appError.message,
      statusCode: appError.statusCode,
      ...(env.NODE_ENV !== "production" && error instanceof Error
        ? { stack: error.stack }
        : {}),
    },
  });
};
