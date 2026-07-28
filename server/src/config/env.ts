import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    CLIENT_URL: z.url().default("http://localhost:5173"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    DATABASE_URL: z
      .string()
      .regex(
        /^postgres(?:ql)?:\/\//,
        "DATABASE_URL must be a PostgreSQL connection URL",
      )
      .optional(),
    JWT_ACCESS_SECRET: z.string().min(32).optional(),
    JWT_REFRESH_SECRET: z.string().min(32).optional(),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") {
      return;
    }

    if (!values.JWT_ACCESS_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_SECRET"],
        message: "JWT_ACCESS_SECRET is required in production",
      });
    }

    if (!values.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["JWT_REFRESH_SECRET"],
        message: "JWT_REFRESH_SECRET is required in production",
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = {
  ...parsedEnv.data,
  JWT_ACCESS_SECRET:
    parsedEnv.data.JWT_ACCESS_SECRET ??
    "development-access-secret-change-before-production",
  JWT_REFRESH_SECRET:
    parsedEnv.data.JWT_REFRESH_SECRET ??
    "development-refresh-secret-change-before-production",
};
export type Env = z.infer<typeof envSchema>;
