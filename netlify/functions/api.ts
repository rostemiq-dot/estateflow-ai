import serverless from "serverless-http";
import { app } from "../../server/src/app.js";
import { bootstrapAdminPassword } from "../../server/src/lib/prisma.js";

const serverlessHandler = serverless(app);

export const handler = async (event: Parameters<typeof serverlessHandler>[0], context: Parameters<typeof serverlessHandler>[1]) => {
  await bootstrapAdminPassword();
  return serverlessHandler(event, context);
};
