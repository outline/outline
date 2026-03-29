import { AsyncLocalStorage } from "node:async_hooks";
import type { IncomingMessage } from "node:http";

/**
 * Async local storage for the current HTTP request context. This allows
 * downstream code (e.g. Sequelize hooks) to check whether the originating
 * request is still alive without explicitly threading `ctx` through every call.
 */
export const requestContext = new AsyncLocalStorage<{
  req: IncomingMessage;
}>();
