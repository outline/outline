import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { User } from "@server/models";

interface McpContext {
  authInfo?: AuthInfo;
}

/**
 * Extracts the authenticated user from the MCP request handler extra object.
 *
 * @param extra - the extra object passed to MCP tool handlers.
 * @returns the authenticated user.
 */
export async function getAuthFromContext(context: McpContext) {
  return context.authInfo?.extra?.user as User;
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
