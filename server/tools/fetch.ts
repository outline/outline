import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Collection, Document, User } from "@server/models";
import { authorize, can } from "@server/policies";
import {
  presentCollection,
  presentDocument,
  presentNavigationNode,
  presentUser,
} from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  getActorFromContext,
  pathToUrl,
  withTracing,
} from "./util";

const SELF_TOKENS = new Set(["self", "me", "current_user"]);

/**
 * Extracts a resource identifier from a value that may be a URL or a plain ID.
 * When a URL is detected the last non-empty path segment is returned as the
 * slug, which the model's findByPk override can resolve.
 *
 * @param value - a URL string or plain identifier.
 * @returns the extracted identifier.
 */
function extractId(value: string): string {
  if (/^https?:\/\//.test(value)) {
    try {
      const pathname = new URL(value).pathname;
      const segments = pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] ?? value;
    } catch {
      return value;
    }
  }
  return value;
}

/**
 * Registers the unified "fetch" MCP tool on the given server. The tool is
 * only registered when at least one of the underlying info scopes is granted.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function fetchTool(server: McpServer, scopes: string[]) {
  const canReadDocuments = AuthenticationHelper.canAccess(
    "documents.info",
    scopes
  );
  const canReadCollections = AuthenticationHelper.canAccess(
    "collections.info",
    scopes
  );
  const canReadUsers = AuthenticationHelper.canAccess("users.info", scopes);

  if (!canReadDocuments && !canReadCollections && !canReadUsers) {
    return;
  }

  const allowedTypes = [
    ...(canReadDocuments ? ["document"] : []),
    ...(canReadCollections ? ["collection"] : []),
    ...(canReadUsers ? ["user"] : []),
  ] as [string, ...string[]];

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        'Fetches a document, collection, or user by type and ID. When fetching a collection the response includes the full hierarchical document tree. For users, "current_user" can be used as the ID to get the authenticated user.',
      annotations: {
        idempotentHint: true,
        readOnlyHint: true,
      },
      inputSchema: {
        resource: z.enum(allowedTypes).describe("The resource to fetch."),
        id: z
          .string()
          .describe(
            'The unique identifier or URL. For users, "current_user" returns the authenticated user.'
          ),
      },
    },
    withTracing("fetch", async ({ resource, id: rawId }, extra) => {
      try {
        const actor = getActorFromContext(extra);
        const id = extractId(rawId);

        switch (resource) {
          case "document": {
            const document = await Document.findByPk(id, {
              userId: actor.id,
              rejectOnEmpty: true,
            });

            authorize(actor, "read", document);

            const { text, ...attributes } = await presentDocument(
              undefined,
              document,
              {
                includeData: false,
                includeText: true,
                includeUpdatedAt: true,
              }
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(pathToUrl(actor.team, attributes)),
                },
                {
                  type: "text" as const,
                  text: String(text ?? ""),
                },
              ],
            } satisfies CallToolResult;
          }

          case "collection": {
            const collection = await Collection.findByPk(id, {
              userId: actor.id,
              includeDocumentStructure: true,
              rejectOnEmpty: true,
            });

            authorize(actor, "read", collection);

            const presented = await presentCollection(undefined, collection);
            return success([
              pathToUrl(actor.team, presented),
              (collection.documentStructure ?? []).map((node) =>
                presentNavigationNode(actor.team, node)
              ),
            ]);
          }

          case "user": {
            const user = SELF_TOKENS.has(id.toLowerCase())
              ? actor
              : await User.findByPk(id, { rejectOnEmpty: true });

            authorize(actor, "read", user);

            return success(
              presentUser(user, {
                includeEmail: !!can(actor, "readEmail", user),
                includeDetails: !!can(actor, "readDetails", user),
              })
            );
          }

          default:
            return error(`Unknown resource: ${resource}`);
        }
      } catch (message) {
        return error(message);
      }
    })
  );
}
