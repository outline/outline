import Koa from "koa";
import bodyParser from "koa-body";
import Router from "@koa/router";
import { Readable } from "node:stream";
import type { Context } from "koa";
import {
  createMcpHandler,
  type McpServerFactory,
  ProtocolErrorCode,
} from "@modelcontextprotocol/server";
import { toError } from "@shared/utils/error";
import { TeamPreference } from "@shared/types";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { createMcpServer } from "@server/mcp";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import type { User } from "@server/models";
import { UserFlag } from "@server/models/User";
import { AuthenticationType } from "@server/types";
import { OAuthHelper } from "@server/utils/oauth/OAuthHelper";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";

const app = new Koa();
const router = new Router();

interface McpAuthExtra {
  user: User;
  scope: string[];
  ip: string;
  origin: string;
}

/**
 * Reports transport errors. These are client-side 4xx conditions (bad Accept
 * header, etc) that the SDK already answers, so warn keeps visibility without
 * reporting client mistakes to Sentry.
 *
 * @param error - the error to report.
 */
function handleTransportError(error: Error) {
  // Clients probe with their latest version and fall back on this error.
  if (error.message.includes("Unsupported protocol version")) {
    return;
  }
  Logger.warn("MCP transport error", error);
}

/**
 * Builds a fresh MCP server for one request, from the auth info set by the route.
 *
 * @param context - the request context with the auth info.
 * @returns a configured MCP server.
 */
const createServer: McpServerFactory = ({ authInfo }) => {
  const extra = authInfo?.extra as McpAuthExtra | undefined;
  if (!extra) {
    throw new Error("MCP request is missing auth info");
  }
  return createMcpServer(
    extra.origin,
    extra.scope,
    extra.user.team.guidanceMCP ?? undefined
  );
};

// Plain JSON replies, which reverse proxies handle more reliably than SSE.
const mcpHandler = createMcpHandler(createServer, {
  responseMode: "json",
  onerror: handleTransportError,
});

/**
 * Converts the Koa request to a web request. The body is not copied, as the
 * SDK reads the parsed body instead.
 *
 * @param ctx - the Koa context.
 * @returns the web request.
 */
function toWebRequest(ctx: Context): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(ctx.req.headers)) {
    for (const item of Array.isArray(value) ? value : [value ?? ""]) {
      headers.append(key, item);
    }
  }
  return new Request(ctx.request.URL, { method: ctx.method, headers });
}

// RFC 9728 / MCP auth spec: 401 responses from the /mcp endpoint must include
// a WWW-Authenticate header pointing at the OAuth protected resource metadata
// document, and the scopes to request, so clients can bootstrap authorization.
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { status?: number }).status === 401
    ) {
      const headersHost = err as { headers?: Record<string, string> };
      const existingHeaders = headersHost.headers ?? {};
      const hasWwwAuth = Object.keys(existingHeaders).some(
        (k) => k.toLowerCase() === "www-authenticate"
      );
      if (!hasWwwAuth) {
        headersHost.headers = {
          ...existingHeaders,
          "WWW-Authenticate": OAuthHelper.mcpBearerChallenge(
            OAuthHelper.getIssuer(ctx)
          ),
        };
      }
    }
    throw err;
  }
});

router.post(
  "/",
  rateLimiter(RateLimiterStrategy.OneThousandPerHour),
  auth({
    type: [
      AuthenticationType.MCP,
      AuthenticationType.OAUTH,
      AuthenticationType.API,
    ],
  }),
  async (ctx) => {
    const { user, token, scope } = ctx.state.auth;

    if (!user.team.getPreference(TeamPreference.MCP)) {
      throw NotFoundError();
    }

    user.setFlag(UserFlag.MCP);
    await user.save({ hooks: false });

    const extra: McpAuthExtra = {
      user,
      scope: scope ?? [],
      ip: ctx.request.ip,
      origin: OAuthHelper.getIssuer(ctx),
    };
    const options = {
      authInfo: {
        token,
        clientId: "",
        scopes: scope ?? [],
        extra: { ...extra },
      },
      parsedBody: ctx.request.body,
    };
    const request = toWebRequest(ctx);

    // The SDK answers known protocol failures itself with a 4xx and a
    // JSON-RPC body. Anything that escapes here is unexpected.
    try {
      const response = await mcpHandler.fetch(request, options);

      ctx.status = response.status;
      response.headers.forEach((value, key) => ctx.set(key, value));
      ctx.body = response.body ? Readable.from(response.body) : "";
    } catch (error) {
      Logger.error(
        "MCP request handling failed",
        toError(error),
        undefined,
        ctx.req
      );

      ctx.status = 500;
      ctx.body = {
        jsonrpc: "2.0",
        error: {
          code: ProtocolErrorCode.InternalError,
          message: "Internal server error",
        },
        id: null,
      };
    }
  }
);

router.get("/", async (ctx) => {
  ctx.status = 405;
  ctx.set("Allow", "POST");
  ctx.body = { error: "Method not allowed. Use POST for MCP requests." };
});

router.delete("/", async (ctx) => {
  ctx.status = 405;
  ctx.set("Allow", "POST");
  ctx.body = { error: "Method not allowed. Use POST for MCP requests." };
});

// Clients probing for a transport we do not implement, such as the legacy
// HTTP+SSE endpoints, must not fall through to the application shell
router.all("{/*path}", async (ctx) => {
  ctx.status = 404;
  ctx.body = { error: "Not found. MCP requests must be sent to /mcp." };
});

app.use(requestTracer());
app.use(bodyParser());
app.use(router.routes());

export default app;
