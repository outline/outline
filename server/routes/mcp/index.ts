import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { toError } from "@shared/utils/error";
import { TeamPreference } from "@shared/types";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import { createMcpServer } from "@server/mcp";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { UserFlag } from "@server/models/User";
import { AuthenticationType } from "@server/types";
import { OAuthHelper } from "@server/utils/oauth/OAuthHelper";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";

const app = new Koa();
const router = new Router();

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

    const server = createMcpServer(
      OAuthHelper.getIssuer(ctx),
      scope ?? [],
      user.team.guidanceMCP ?? undefined
    );
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // onerror fires for client-side 4xx conditions (bad Accept header, etc)
    // which the transport already answers with an HTTP error — warn keeps
    // visibility without reporting client mistakes to Sentry.
    transport.onerror = (error) => {
      Logger.warn("MCP transport error", error);
    };

    await server.connect(transport);

    // Attach auth info to the raw request so the MCP transport
    // passes it through as `extra.authInfo` to tool handlers.
    (ctx.req as typeof ctx.req & { auth: AuthInfo }).auth = {
      token,
      clientId: "",
      scopes: scope ?? [],
      extra: { user, scope: scope ?? [], ip: ctx.request.ip },
    };

    ctx.respond = false;

    // The SDK's handleRequest answers known protocol failures itself (4xx with a
    // JSON-RPC body) via the transport. Anything that escapes here is unexpected.
    try {
      await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
    } catch (error) {
      Logger.error(
        "MCP request handling failed",
        toError(error),
        undefined,
        ctx.req
      );

      if (!ctx.res.headersSent) {
        ctx.res.writeHead(500, { "Content-Type": "application/json" });
        ctx.res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: ErrorCode.InternalError,
              message: "Internal server error",
            },
            id: null,
          })
        );
      } else {
        ctx.res.end();
      }
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
router.all("*", async (ctx) => {
  ctx.status = 404;
  ctx.body = { error: "Not found. MCP requests must be sent to /mcp." };
});

app.use(requestTracer());
app.use(bodyParser());
app.use(router.routes());

export default app;
