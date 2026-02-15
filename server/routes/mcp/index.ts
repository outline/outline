import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Logger from "@server/logging/Logger";
import auth from "@server/middlewares/authentication";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import requestTracer from "@server/middlewares/requestTracer";
import { AuthenticationType } from "@server/types";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";

const app = new Koa();
const router = new Router();

/**
 * Creates a fresh MCP server instance with registered tools.
 *
 * @returns a configured McpServer ready to be connected to a transport.
 */
function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "outline",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.registerTool(
    "hello-world",
    {
      description: "A test tool that returns a greeting",
    },
    () => ({
      content: [{ type: "text", text: "Hello from Outline!" }],
    })
  );

  return server;
}

router.post(
  "/mcp",
  rateLimiter(RateLimiterStrategy.OneThousandPerHour),
  auth({ type: AuthenticationType.OAUTH }),
  async (ctx) => {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    transport.onerror = (error) => {
      Logger.error("MCP transport error", error);
    };

    await server.connect(transport);

    ctx.respond = false;
    await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
  }
);

router.get("/mcp", async (ctx) => {
  ctx.status = 405;
  ctx.set("Allow", "POST");
  ctx.body = { error: "Method not allowed. Use POST for MCP requests." };
});

router.delete("/mcp", async (ctx) => {
  ctx.status = 405;
  ctx.set("Allow", "POST");
  ctx.body = { error: "Method not allowed. Use POST for MCP requests." };
});

app.use(requestTracer());
app.use(bodyParser());
app.use(router.routes());

export default app;
