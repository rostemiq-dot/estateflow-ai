import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import type { AuthRepository } from "../services/auth.repository.js";
import type { TokenService } from "../services/jwt.service.js";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../config/env.js";

export const createAuthenticate = (
  tokens: TokenService,
  repository: AuthRepository,
): RequestHandler => {
  const supabase = env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;
  return async (req, _res, next) => {
    try {
      const authorization = req.get("authorization");
      const match = authorization?.match(/^Bearer ([^\s]+)$/);

      if (!match) {
        throw new AppError("Authentication required", 401);
      }

      if (supabase) {
        const { data, error } = await supabase.auth.getUser(match[1]);
        if (error || !data.user?.email) throw new AppError("Authentication required", 401);
        const user = await repository.findUserByEmail(data.user.email) ??
          (repository.provisionSupabaseUser ? await repository.provisionSupabaseUser(data.user.email, String(data.user.user_metadata?.agency_name ?? "My Agency")) : null);
        if (!user || !user.isActive) throw new AppError("Application account is not provisioned", 403);
        req.user = { id: user.id, email: user.email, agencyId: user.agencyId, role: user.role };
        next();
        return;
      }

      const payload = tokens.verifyAccessToken(match[1]);
      const user = await repository.findUserById(payload.sub);

      if (!user || !user.isActive || user.agencyId !== payload.agencyId) {
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
