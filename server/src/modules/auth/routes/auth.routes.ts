import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { createAuthenticate } from "../middleware/authenticate.js";
import { validateBody } from "../middleware/validate.js";
import {
  AuthService,
  type AuthServiceContract,
} from "../services/auth.service.js";
import { JwtTokenService, type TokenService } from "../services/jwt.service.js";
import { BcryptPasswordService } from "../services/password.service.js";
import { PrismaAuthRepository } from "../services/prisma-auth.repository.js";
import type { AuthRepository } from "../services/auth.repository.js";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";

type AuthRouterDependencies = {
  authService: AuthServiceContract;
  authenticate: ReturnType<typeof createAuthenticate>;
};

export const createAuthRouter = ({
  authService,
  authenticate,
}: AuthRouterDependencies) => {
  const router = Router();
  const controller = new AuthController(authService);

  router.post("/register", validateBody(registerSchema), controller.register);
  router.post("/login", validateBody(loginSchema), controller.login);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);
  router.get("/me", authenticate, controller.me);

  return router;
};

const repository: AuthRepository = new PrismaAuthRepository();
const tokenService: TokenService = new JwtTokenService();
const authService = new AuthService(
  repository,
  tokenService,
  new BcryptPasswordService(),
);

export const authRouter = createAuthRouter({
  authService,
  authenticate: createAuthenticate(tokenService, repository),
});
