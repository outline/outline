import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { TeamPreference } from "@shared/types";
import { NotFoundError } from "@server/errors";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
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

const defaultInstructions = `Document and collection markdown support @mentions using the syntax: @[Display Name](mention://user/userId). For example: @[John Doe](mention://user/c9a1b2e3-...). Use the list_users tool to find user IDs.`;

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
