import Koa from "koa";
import type { Next } from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { TeamPreference } from "@shared/types";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { UserFlag } from "@server/models/User";
import type { AppContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { attachmentTools } from "@server/tools/attachments";
import { collectionTools } from "@server/tools/collections";
import { commentTools } from "@server/tools/comments";
import { documentTools } from "@server/tools/documents";
import { fetchTool } from "@server/tools/fetch";
import { userTools } from "@server/tools/users";
import { version } from "../../../package.json";

const app = new Koa();
const router = new Router();

const defaultInstructions = `Document markdown content must not begin with a top-level heading (H1) — the title is stored as a separate field, so set it via the title parameter and start the content with body text or a lower-level heading instead.

Document and collection markdown support @mentions using the syntax: @[Display Name](mention://user/userId). For example: @[John Doe](mention://user/c9a1b2e3-...). Use the "list_users" tool to find user IDs.

Read images and attachments with the "fetch" tool by setting resource to "attachment" and passing either the attachment ID or an /api/attachments.redirect?id=... URL; the tool will return a signed URL for download.`;

/**
 * Creates a fresh MCP server instance with tools filtered by the OAuth
 * scopes granted to the current token.
 *
 * @param scopes - the OAuth scopes granted to the access token.
 * @param guidance - optional workspace guidance to append to default instructions.
 * @returns a configured McpServer ready to be connected to a transport.
 */
function createMcpServer(scopes: string[], guidance?: string): McpServer {
  const instructions = guidance
    ? `${defaultInstructions}\n\n${guidance}`
    : defaultInstructions;

  const server = new McpServer(
    {
      name: "outline",
      version,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions,
    }
  );

  attachmentTools(server, scopes);
  collectionTools(server, scopes);
  commentTools(server, scopes);
  documentTools(server, scopes);
  fetchTool(server, scopes);
  userTools(server, scopes);

  return server;
}

/**
 * Adds the RFC 9728 `WWW-Authenticate` challenge header to 401 responses so that
 * OAuth-enabled MCP clients can discover the protected resource metadata URL and
 * (re-)enter the authorization flow when their token is missing, invalid, or expired.
 *
 * @param ctx - the application context.
 * @param next - the next middleware in the chain.
 */
async function mcpAuthChallenge(ctx: AppContext, next: Next) {
  try {
    await next();
  } catch (err) {
    if (err?.status === 401) {
      // Use the configured URL for self-hosted deployments to preserve the port
      // when behind a reverse proxy that may strip the port from the Host header.
      const origin = env.isCloudHosted
        ? ctx.request.URL.origin
        : new URL(env.URL).origin;
      const params = [
        `resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
      ];
      // A token was supplied but rejected (invalid or expired) — signal that to
      // the client per RFC 6750 so it knows to refresh rather than re-prompt.
      if (ctx.request.get("authorization")) {
        params.push(`error="invalid_token"`);
      }
      err.headers = {
        ...err.headers,
        "WWW-Authenticate": `Bearer ${params.join(", ")}`,
      };
    }
    throw err;
  }
}

router.post(
  "/",
  mcpAuthChallenge,
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
    await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
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

app.use(requestTracer());
app.use(bodyParser());
app.use(router.routes());

export default app;
