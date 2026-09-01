import type { Handler } from "aws-lambda";
import serverless from "serverless-http";
import { app } from "../../server/src/app.js";

// Netlify's rewrite may expose the function path instead of the original
// /api path. Restore it before handing the request to the unchanged Express app.
const apiHandler = serverless(app);

export const handler: Handler = async (event, context) => {
  if (event.path.startsWith("/.netlify/functions/api")) {
    const suffix = event.path.slice("/.netlify/functions/api".length);
    event.path = `/api${suffix || ""}`;
    event.rawPath = event.path;
    event.rawQuery = event.rawQuery ?? "";
  } else if (!event.path.startsWith("/api")) {
    event.path = `/api${event.path === "/" ? "" : event.path}`;
    event.rawPath = event.path;
  }
  return apiHandler(event, context);
};
