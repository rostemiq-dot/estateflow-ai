import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../../../errors/app-error.js";

export const validateBody = (schema: ZodType): RequestHandler => {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError("Invalid request data", 400));
      return;
    }

    req.body = result.data;
    next();
  };
};
