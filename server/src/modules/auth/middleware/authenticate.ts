import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthRepository } from "../services/auth.repository.js";
import type { TokenService } from "../services/jwt.service.js";

export const createAuthenticate = (
  tokens: TokenService,
  repository: AuthRepository,
): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const authorization = req.get("authorization");
      const match = authorization?.match(/^Bearer ([^\s]+)$/);

      if (!match) {
        throw new AppError("Authentication required", 401);
      }

      const payload = tokens.verifyAccessToken(match[1]);
      const user = await repository.findUserById(payload.sub);

      if (!user || user.agencyId !== payload.agencyId) {
        throw new AppError("Authentication required", 401);
      }

      req.user = {
        id: user.id,
        email: user.email,
        agencyId: user.agencyId,
        role: user.role,
      };
      next();
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new AppError("Authentication required", 401),
      );
    }
  };
};
