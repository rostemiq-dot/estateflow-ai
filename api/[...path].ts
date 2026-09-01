import serverless from "serverless-http";
import { app } from "../server/src/app.js";

// Vercel routes /api/* requests to this function. Express already registers
// the same /api/* route prefixes, so no business logic is duplicated here.
export default serverless(app);
