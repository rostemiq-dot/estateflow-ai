import type { CookieOptions, RequestHandler } from "express";
import { env } from "../../../config/env.js";
import { AppError } from "../../../errors/app-error.js";
import type { AuthResult } from "../types/auth.types.js";
import type {
  LoginInput,
  RegisterInput,
} from "../validators/auth.validators.js";
import type { AuthServiceContract } from "../services/auth.service.js";
import { REFRESH_TOKEN_TTL_SECONDS } from "../services/jwt.service.js";

export const REFRESH_COOKIE_NAME = "estateflow_refresh";

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1_000,
  path: "/api/auth",
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
};

const clearRefreshCookieOptions: CookieOptions = {
  ...refreshCookieOptions,
  maxAge: undefined,
};

export class AuthController {
  constructor(private readonly authService: AuthServiceContract) {}

  register: RequestHandler = async (req, res, next) => {
    try {
      const result = await this.authService.register(req.body as RegisterInput);
      this.setRefreshCookie(res, result);
      res.status(201).json(toAuthResponse(result));
    } catch (error) {
      next(error);
    }
  };

  login: RequestHandler = async (req, res, next) => {
    try {
      const result = await this.authService.login(req.body as LoginInput);
      this.setRefreshCookie(res, result);
      res.status(200).json(toAuthResponse(result));
    } catch (error) {
      next(error);
    }
  };

  refresh: RequestHandler = async (req, res, next) => {
    try {
      const refreshToken = readRefreshCookie(req);

      if (!refreshToken) {
        throw new AppError("Invalid or expired session", 401);
      }

      const result = await this.authService.refresh(refreshToken);
      this.setRefreshCookie(res, result);
      res.status(200).json(toAuthResponse(result));
    } catch (error) {
      next(error);
    }
  };

  logout: RequestHandler = async (req, res, next) => {
    try {
      await this.authService.logout(readRefreshCookie(req));
      res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401);
      }

      const user = await this.authService.getCurrentUser(req.user.id);
      res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  };

  private setRefreshCookie(
    res: Parameters<RequestHandler>[1],
    result: AuthResult,
  ) {
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions);
  }
}

const readRefreshCookie = (req: Parameters<RequestHandler>[0]) => {
  const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};

const toAuthResponse = ({
  accessToken,
  accessTokenExpiresIn,
  user,
}: AuthResult) => ({
  success: true,
  accessToken,
  tokenType: "Bearer",
  expiresIn: accessTokenExpiresIn,
  user,
});
