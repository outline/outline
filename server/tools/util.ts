import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Collection, type Team, type User } from "@server/models";
import { addTags } from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import { can } from "@server/policies";
import { type APIContext, AuthenticationType } from "@server/types";
import type { NavigationNode } from "@shared/types";

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
  const ip = context.authInfo?.extra?.ip as string | undefined;

  const auth = {
    user,
    token,
    type: AuthenticationType.MCP,
  };

  return {
    state: { auth },
    context: { auth, ip },
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
 * Wraps an MCP tool handler with Datadog tracing. Each invocation creates a
 * span under the `outline-mcp` service with the tool name as the resource,
 * and tags it with the acting user and team IDs.
 *
 * @param toolName - the name of the MCP tool being traced.
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
 * Builds a map from document ID to its zero-based index among siblings,
 * derived from a collection's document structure.
 *
 * @param nodes - the top-level navigation nodes from a collection's documentStructure.
 * @returns a map of document ID to sibling index.
 */
export function buildSiblingIndexMap(
  nodes: NavigationNode[]
): Map<string, number> {
  const map = new Map<string, number>();

  function walk(children: NavigationNode[]) {
    children.forEach((node, idx) => {
      map.set(node.id, idx);
      walk(node.children);
    });
  }

  walk(nodes);
  return map;
}

/**
 * Builds a human-readable breadcrumb string showing a document's location.
 * The path includes only ancestors (collection name plus any parent document
 * titles) — not the document itself, since callers already have the title.
 * Documents at the root of a collection get just the collection name.
 *
 * @param documentId - the ID of the document to locate.
 * @param structure - the collection's documentStructure tree, may be null.
 * @param collectionName - the name of the containing collection.
 * @returns the breadcrumb string, e.g. "Engineering › Onboarding".
 */
export function buildBreadcrumb(
  documentId: string,
  structure: NavigationNode[] | null | undefined,
  collectionName: string
): string {
  const ancestors: string[] = [];

  if (structure) {
    const findPath = (nodes: NavigationNode[], chain: string[]): boolean => {
      for (const node of nodes) {
        if (node.id === documentId) {
          ancestors.push(...chain);
          return true;
        }
        if (findPath(node.children, [...chain, node.title])) {
          return true;
        }
      }
      return false;
    };

    findPath(structure, []);
  }

  return [collectionName, ...ancestors].join(" › ");
}

/**
 * Resolves a breadcrumb string for a document by loading its collection's
 * cached documentStructure. Returns undefined when the document has no
 * collection, the collection cannot be loaded, or the user lacks read
 * access to the collection — the latter prevents leaking collection and
 * ancestor names to users granted access to a single nested document via
 * direct membership without wider collection access.
 *
 * @param document - the document to build a breadcrumb for.
 * @param user - the user performing the action, used to authorize collection access.
 * @returns the breadcrumb string, or undefined.
 */
export async function getDocumentBreadcrumb(
  document: { id: string; collectionId?: string | null },
  user: User
): Promise<string | undefined> {
  if (!document.collectionId) {
    return undefined;
  }

  const collection = await Collection.findByPk(document.collectionId, {
    userId: user.id,
  });
  if (!collection || !can(user, "read", collection)) {
    return undefined;
  }

  const structure = await collection.getCachedDocumentStructure();
  return buildBreadcrumb(document.id, structure, collection.name);
}

/**
 * Resolves breadcrumb strings for a batch of documents in a single pass.
 * Loads all referenced collections (with the user's memberships) in one
 * query, filters by collection-level read access, then loads each
 * collection's cached documentStructure once.
 *
 * @param documents - the documents to build breadcrumbs for.
 * @param user - the user performing the action, used to authorize collection access.
 * @returns a map from document ID to breadcrumb string.
 */
export async function getBreadcrumbsForDocuments(
  documents: { id: string; collectionId?: string | null }[],
  user: User
): Promise<Map<string, string>> {
  const breadcrumbs = new Map<string, string>();

  const collectionIds = [
    ...new Set(
      documents
        .map((doc) => doc.collectionId)
        .filter((id): id is string => !!id)
    ),
  ];
  if (collectionIds.length === 0) {
    return breadcrumbs;
  }

  const collections = await Collection.scope([
    "defaultScope",
    { method: ["withMembership", user.id] },
  ]).findAll({
    where: { id: collectionIds },
  });

  const collectionsById = new Map(
    collections
      .filter((collection) => can(user, "read", collection))
      .map((collection) => [collection.id, collection])
  );

  for (const doc of documents) {
    if (!doc.collectionId) {
      continue;
    }
    const collection = collectionsById.get(doc.collectionId);
    if (!collection) {
      continue;
    }
    const structure = await collection.getCachedDocumentStructure();
    breadcrumbs.set(
      doc.id,
      buildBreadcrumb(doc.id, structure, collection.name)
    );
  }

  return breadcrumbs;
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
