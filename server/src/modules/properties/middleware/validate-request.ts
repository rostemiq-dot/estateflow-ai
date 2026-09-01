import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { AppError } from "../../../errors/app-error.js";

type RequestTarget = "body" | "params" | "query";

export const validateRequest = (
  target: RequestTarget,
  schema: ZodType,
): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(new AppError("Invalid request data", 400));
      return;
    }

    if (target === "query") {
      res.locals.validatedQuery = result.data;
    } else {
      Object.assign(req[target], result.data);
    }
    next();
  };
};
