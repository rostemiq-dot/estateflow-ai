import "dotenv/config";
import { z } from "zod";

const postgresUrl = z
  .string()
  .regex(
    /^postgres(?:ql)?:\/\//,
    "Database URL must be a PostgreSQL connection URL",
  );

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
    DATABASE_URL: postgresUrl.optional(),
    DIRECT_URL: postgresUrl.optional(),
    SUPABASE_URL: z.url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
  })
  .superRefine((values, context) => {
    if (values.NODE_ENV !== "production") return;

    if (!values.DATABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL is required in production",
      });
    }

    if (!values.SUPABASE_URL) {
      context.addIssue({
        code: "custom",
        path: ["SUPABASE_URL"],
        message: "SUPABASE_URL is required in production",
      });
    }

    if (!values.SUPABASE_ANON_KEY) {
      context.addIssue({
        code: "custom",
        path: ["SUPABASE_ANON_KEY"],
        message: "SUPABASE_ANON_KEY is required in production",
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

const parsedValues = parsedEnv.data;

// Railway can run the persistent API with DATABASE_URL alone. If a separate
// DIRECT_URL is configured, keep using it; otherwise fall back to DATABASE_URL.
export const env = {
  ...parsedValues,
  DIRECT_URL: parsedValues.DIRECT_URL ?? parsedValues.DATABASE_URL,
};

export type Env = typeof env;
