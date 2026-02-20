// eslint-disable no-restricted-imports
import type { Response } from "node-fetch";

let nextId = 1;

/**
 * Returns HTTP headers required for MCP requests with OAuth authentication.
 *
 * @param accessToken - the OAuth access token.
 * @returns headers object for use with TestServer.post().
 */
export function mcpHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json, text/event-stream",
  };
}

/**
 * Builds a JSON-RPC request object for MCP.
 *
 * @param method - the JSON-RPC method to call (e.g. "tools/call").
 * @param params - the params object for the method.
 * @returns an object with the JSON-RPC body and its id.
 */
export function mcpRequest(method: string, params?: Record<string, unknown>) {
  const id = nextId++;

  const body = {
    jsonrpc: "2.0" as const,
    id,
    method,
    ...(params !== undefined ? { params } : {}),
  };

  return { body, resultId: id };
}

/**
 * Parses an MCP HTTP response. The transport responds with
 * `text/event-stream` (SSE). This helper extracts the JSON-RPC response
 * from the SSE data lines.
 *
 * @param res - the node-fetch Response from TestServer.
 * @returns the parsed JSON-RPC result object.
 */
export async function parseMcpResponse(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (contentType.includes("text/event-stream")) {
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice("data: ".length).trim();
        if (data) {
          return JSON.parse(data) as Record<string, unknown>;
        }
      }
    }
    return undefined;
  }

  return JSON.parse(text) as Record<string, unknown>;
}

/**
 * Shorthand to call an MCP tool via the test server. Sends a single
 * JSON-RPC `tools/call` request and returns the parsed result.
 *
 * @param server - the TestServer instance.
 * @param accessToken - the OAuth access token.
 * @param toolName - the name of the tool to call.
 * @param args - the arguments to pass to the tool.
 * @returns the parsed tool call result.
 */
export async function callMcpTool(
  server: { post: (path: string, opts: unknown) => Promise<Response> },
  accessToken: string,
  toolName: string,
  args: Record<string, unknown> = {}
) {
  const { body } = mcpRequest("tools/call", {
    name: toolName,
    arguments: args,
  });

  const res = await server.post("/mcp/", {
    headers: mcpHeaders(accessToken),
    body,
  });

  const parsed = await parseMcpResponse(res);
  return parsed as
    | {
        result?: { content?: { text?: string }[]; isError?: boolean };
        error?: unknown;
      }
    | undefined;
}

/**
 * Shorthand to read an MCP resource via the test server.
 *
 * @param server - the TestServer instance.
 * @param accessToken - the OAuth access token.
 * @param uri - the resource URI to read.
 * @returns the parsed resource read result.
 */
export async function readMcpResource(
  server: { post: (path: string, opts: unknown) => Promise<Response> },
  accessToken: string,
  uri: string
) {
  const { body } = mcpRequest("resources/read", { uri });

  const res = await server.post("/mcp/", {
    headers: mcpHeaders(accessToken),
    body,
  });

  const parsed = await parseMcpResponse(res);
  return parsed as
    | {
        result?: { contents?: { text?: string; mimeType?: string }[] };
        error?: unknown;
      }
    | undefined;
}
