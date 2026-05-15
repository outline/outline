import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Attachment, Collection, Document, User } from "@server/models";
import { authorize, can } from "@server/policies";
import { AuthorizationError } from "@server/errors";
import {
  presentCollection,
  presentNavigationNode,
  presentUser,
} from "@server/presenters";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { presentDocument } from "./documents";
import {
  error,
  success,
  getActorFromContext,
  getDocumentBreadcrumb,
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
      const url = new URL(value);
      const queryId = url.searchParams.get("id");
      if (queryId) {
        return queryId;
      }
      const segments = url.pathname.split("/").filter(Boolean);
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
  const canReadAttachments = AuthenticationHelper.canAccess(
    "attachments.info",
    scopes
  );

  if (
    !canReadDocuments &&
    !canReadCollections &&
    !canReadUsers &&
    !canReadAttachments
  ) {
    return;
  }

  const allowedTypes = [
    ...(canReadDocuments ? ["document"] : []),
    ...(canReadCollections ? ["collection"] : []),
    ...(canReadUsers ? ["user"] : []),
    ...(canReadAttachments ? ["attachment"] : []),
  ] as [string, ...string[]];

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        'Fetches a document, collection, user, or attachment by type and ID. When fetching a collection the response includes the full hierarchical document tree. For users, "current_user" can be used as the ID to get the authenticated user. For attachments, the response includes a short-lived signed URL that can be used to download the file contents directly.',
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

            const [{ text, ...attributes }, breadcrumb] = await Promise.all([
              presentDocument(document, {
                includeData: false,
                includeText: true,
                includeUpdatedAt: true,
                includeCommentCount: true,
              }),
              getDocumentBreadcrumb(document, actor),
            ]);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    document: pathToUrl(actor.team, attributes),
                    ...(breadcrumb !== undefined && { breadcrumb }),
                  }),
                },
                {
                  type: "text" as const,
                  text: typeof text === "string" ? text : "",
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

          case "attachment": {
            const attachment = await Attachment.findByPk(id, {
              rejectOnEmpty: true,
            });

            // Private attachments are accessible to any member of the workspace they
            // belong to. This is intentional and not a permission bypass – attachments
            // are owned by the workspace (team), not by individual documents or users.
            if (attachment.teamId !== actor?.teamId) {
              throw AuthorizationError();
            }

            return success({
              id: attachment.id,
              name: attachment.name,
              contentType: attachment.contentType,
              size: attachment.size,
              signedUrl: await attachment.signedUrl,
            });
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
