import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Team, User } from "@server/models";
import { addTags } from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import { type APIContext, AuthenticationType } from "@server/types";

interface McpContext {
  authInfo?: AuthInfo;
}

/**
 * Extracts the authenticated user from the MCP request handler extra object.
 *
 * @param context - the extra object passed to MCP tool handlers.
 * @returns the authenticated user.
 */
export function getActorFromContext(context: McpContext) {
  return context.authInfo?.extra?.user as User;
}

/**
 * Constructs a minimal APIContext from the MCP request context for use with
 * server commands that require a Koa-style context.
 *
 * @param context - the MCP request context.
 * @returns a partial APIContext suitable for command functions.
 */
export function buildAPIContext(context: McpContext) {
  const user = context.authInfo?.extra?.user as User;
  const token = context.authInfo?.token ?? "";

  const auth = {
    user,
    token,
    type: AuthenticationType.OAUTH,
  };

  return {
    state: { auth },
    context: { auth },
  } as unknown as APIContext;
}

/**
 * Helper function to format successful MCP tool responses.
 *
 * @param data - the data to include in the response.
 * @returns a formatted response object for MCP tools.
 */
export function success<T>(data: T | T[]): CallToolResult {
  const payload = Array.isArray(data) ? data : [data];

  return {
    content: payload.map((item) => ({
      type: "text" as const,
      text: JSON.stringify(item),
    })),
  };
}

/**
 * Helper function to format error MCP tool responses.
 *
 * @param message - the error message or error to include in the response.
 * @returns a formatted error response object for MCP tools.
 */
export function error(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);

  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/**
 * Wraps an MCP tool or resource handler with Datadog tracing. Each invocation
 * creates a span under the `outline-mcp` service with the tool name as the
 * resource, and tags it with the acting user and team IDs.
 *
 * @param toolName - the name of the MCP tool or resource being traced.
 * @param handler - the handler function to wrap.
 * @returns the wrapped handler with tracing enabled.
 */
export function withTracing<F extends (...args: any[]) => any>(
  toolName: string,
  handler: F
): F {
  return traceFunction({
    serviceName: "mcp",
    spanName: "tool",
    resourceName: toolName,
  })(function tracedHandler(this: any, ...args: any[]) {
    const context = args[args.length - 1];
    const user = getActorFromContext(context);
    if (user) {
      addTags({
        "mcp.tool": toolName,
        "request.userId": user.id,
        "request.teamId": user.teamId,
      });
    }
    return handler.apply(this, args);
  } as F);
}

/**
 * Utility function to construct a URL by joining a team URL with a path segment.
 *
 * @param team - the team object containing the base URL.
 * @param input - an object with attributes keys to be joined with the team URL.
 * @returns the combined URL string.
 */
export function pathToUrl(team: Team, input: Record<string, unknown>) {
  const baseUrl = team.url;

  for (const [key, value] of Object.entries(input)) {
    if (["url", "path"].includes(key) && typeof value === "string") {
      // check for existing protocol to avoid double joining
      if (/^https?:\/\//.test(value)) {
        input[key] = value;
      } else {
        input[key] = new URL(value, baseUrl).href;
      }
    }
  }

  return input;
}
