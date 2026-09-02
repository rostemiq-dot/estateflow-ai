import { createClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";
import { AppError } from "../../../errors/app-error.js";
import { env } from "../../../config/env.js";
import { PrismaAuthRepository } from "../services/prisma-auth.repository.js";
import type { AuthRepository } from "../services/auth.repository.js";

export const createAuthenticate = (
  repository: AuthRepository = new PrismaAuthRepository(),
): RequestHandler => {
  const supabase =
    env.SUPABASE_URL && env.SUPABASE_ANON_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  return async (req, _res, next) => {
    try {
      if (!supabase) {
        throw new AppError("Authentication service is not configured", 503);
      }

      const authorization = req.get("authorization");
      const match = authorization?.match(/^Bearer ([^\s]+)$/);

      if (!match) {
        throw new AppError("Authentication required", 401);
      }

      const { data, error } = await supabase.auth.getUser(match[1]);
      if (error || !data.user?.email) {
        throw new AppError("Authentication required", 401);
      }

      const user =
        (await repository.findUserByEmail(data.user.email)) ??
        (await repository.provisionSupabaseUser(
          data.user.email,
          String(data.user.user_metadata?.agency_name ?? "My Agency"),
        ));

      if (!user || !user.isActive) {
        throw new AppError("Application account is not provisioned", 403);
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
