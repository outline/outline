import { chunk, snakeCase } from "es-toolkit/compat";
import type { Middleware } from "koa";
import compose from "koa-compose";
import Router from "koa-router";
import auth from "@server/middlewares/authentication";
import {
  defaultRateLimiter,
  rateLimiter,
} from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import type { APIContext, AppContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { toError } from "@shared/utils/error";
import collections from "../collections";
import documents from "../documents";
import apiErrorHandler from "../middlewares/apiErrorHandler";
import * as T from "./schema";

const router = new Router();

/**
 * Error transforms applied to each sub-request, mirroring the handler that
 * wraps top-level API routes so batched responses have full parity.
 */
const handleErrors = apiErrorHandler();

/**
 * Enforces each sub-request against its own method's rate limiter, mirroring the
 * global limiter that runs once per top-level request, so that batching cannot
 * be used to bypass per-endpoint limits.
 */
const enforceRateLimit = defaultRateLimiter();

/**
 * The individual endpoints that may be invoked within a batch. Deliberately
 * curated to simple JSON mutations — no reads (pagination), redirects, file
 * responses, or endpoints that set response headers.
 */
const allowedMethods = new Set<string>([
  "documents.update",
  "documents.move",
  "documents.archive",
  "documents.restore",
  "documents.unpublish",
  "documents.delete",
  "collections.update",
  "collections.move",
  "collections.archive",
  "collections.restore",
  "collections.delete",
]);

/** Routers searched for an allowed method's middleware stack. */
const dispatchableRouters: Router[] = [documents, collections];

/** The number of sub-requests dispatched in parallel, to limit pool pressure. */
const BatchConcurrency = 2;

interface HttpError extends Error {
  status?: number;
  id?: string;
}

interface RouteResponse {
  data?: unknown;
  policies?: unknown;
}

interface BatchResult {
  status: number;
  ok: boolean;
  data?: unknown;
  policies?: unknown;
  error?: string;
  message?: string;
}

/**
 * Locates the middleware stack for an allowlisted method.
 *
 * @param method The RPC method name, e.g. "documents.update".
 * @returns the route's middleware stack, or undefined if not permitted.
 */
function resolveStack(method: string): Middleware[] | undefined {
  if (!allowedMethods.has(method)) {
    return undefined;
  }
  for (const resourceRouter of dispatchableRouters) {
    for (const layer of resourceRouter.stack) {
      // Layer paths are lazily prefixed with "/" once mounted, so accept both.
      if (
        (layer.path === method || layer.path === `/${method}`) &&
        layer.methods.includes("POST")
      ) {
        return layer.stack;
      }
    }
  }
  return undefined;
}

/**
 * Creates an isolated child context for a single batched request so that its
 * request body, state, transaction, and response are independent from sibling
 * requests and from the parent. Headers, cookies, and query are inherited.
 *
 * @param ctx The parent request context.
 * @param body The request body for the child.
 * @returns the child context and a handle to its captured response.
 */
function createSubContext(
  ctx: AppContext,
  method: string,
  body: Record<string, unknown>
) {
  const sub: AppContext = Object.create(ctx);
  // A shallow copy so middleware writes (auth, transaction) don't leak between
  // concurrent sub-requests or back to the parent.
  sub.state = { ...ctx.state };
  sub.request = Object.create(ctx.request);
  sub.request.body = body;
  // Present the sub-request's own path so per-method rate limiting keys on the
  // dispatched method rather than the shared /batch path.
  Object.defineProperty(sub, "path", {
    configurable: true,
    get: () => `/${method}`,
  });

  const captured: { body?: RouteResponse; status: number } = { status: 404 };
  Object.defineProperty(sub, "body", {
    configurable: true,
    get: () => captured.body,
    set: (value: RouteResponse) => {
      captured.body = value;
      if (captured.status === 404) {
        captured.status = 200;
      }
    },
  });
  Object.defineProperty(sub, "status", {
    configurable: true,
    get: () => captured.status,
    set: (value: number) => {
      captured.status = value;
    },
  });
  // Re-bind ctx.context to this child so mutations use the child's transaction
  // rather than the parent's (the getter from apiContext closes over its ctx).
  Object.defineProperty(sub, "context", {
    configurable: true,
    get: () => ({
      auth: sub.state.auth,
      transaction: sub.state.transaction,
      ip: sub.request.ip,
    }),
  });

  return { sub, captured };
}

/**
 * Dispatches a single sub-request through its real route, reusing that route's
 * authentication, validation, transaction, and presenters.
 *
 * @param ctx The parent request context.
 * @param method The RPC method name to invoke.
 * @param body The request body for the method.
 * @returns the result, shaped like a standard API response envelope.
 */
async function dispatch(
  ctx: AppContext,
  method: string,
  body: Record<string, unknown>
): Promise<BatchResult> {
  const stack = resolveStack(method);
  if (!stack) {
    return {
      status: 400,
      ok: false,
      error: "invalid_request",
      message: `Method not permitted in batch: ${method}`,
    };
  }

  const { sub, captured } = createSubContext(ctx, method, body);
  try {
    await compose([handleErrors, enforceRateLimit, ...stack])(sub);
    return {
      status: captured.status,
      ok: captured.status < 400,
      data: captured.body?.data,
      policies: captured.body?.policies,
    };
  } catch (err) {
    const error: HttpError = toError(err);
    return {
      status: typeof error.status === "number" ? error.status : 500,
      ok: false,
      error: error.id ? snakeCase(error.id) : "internal_error",
      message: error.message,
    };
  }
}

router.post(
  "batch",
  rateLimiter(RateLimiterStrategy.TwentyFivePerMinute),
  auth({ type: AuthenticationType.APP }),
  validate(T.BatchSchema),
  async (ctx: APIContext<T.BatchReq>) => {
    const { requests } = ctx.input.body;

    // Allow 1s per sub-request, clamped between a 15s floor and 25s ceiling.
    const originalTimeout = ctx.req.socket.timeout || 0;
    ctx.req.socket.setTimeout(
      Math.min(25000, Math.max(15000, requests.length * 1000))
    );

    try {
      const data: BatchResult[] = [];
      // Process in bounded groups so a single batch can't exhaust the pool.
      for (const group of chunk(requests, BatchConcurrency)) {
        const results = await Promise.all(
          group.map((request) =>
            dispatch(ctx, request.method, request.body ?? {})
          )
        );
        data.push(...results);
      }
      ctx.body = { data };
    } finally {
      ctx.req.socket.setTimeout(originalTimeout);
    }
  }
);

export default router;
