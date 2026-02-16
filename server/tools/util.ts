import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { User } from "@server/models";
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
export function getAuthFromContext(context: McpContext) {
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
export async function success<T>(data: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

/**
 * Helper function to format error MCP tool responses.
 *
 * @param message - the error message to include in the response.
 * @returns a formatted error response object for MCP tools.
 */
export async function error(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
  };
}
