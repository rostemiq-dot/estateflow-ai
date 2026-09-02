import type { IncomingMessage, ServerResponse } from "node:http";

declare module "@vercel/node" {
  export interface VercelRequest extends IncomingMessage {
    query: Record<string, string | string[]>;
    body?: unknown;
  }

  export interface VercelResponse extends ServerResponse<IncomingMessage> {
    status(code: number): VercelResponse;
    json(body: unknown): VercelResponse;
    send(body: unknown): VercelResponse;
  }
}
