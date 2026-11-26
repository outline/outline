import { z } from "zod";
import type { McpServer, CallToolResult } from "@modelcontextprotocol/server";
import {
  Attachment,
  Collection,
  Document,
  Template,
  User,
} from "@server/models";
import { authorize, can } from "@server/policies";
import { AuthorizationError } from "@server/errors";
import { presentNavigationNode, presentUser } from "@server/presenters";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import { presentCollection } from "./collections";
import { presentDocument } from "./documents";
import { presentTemplate } from "./templates";
import {
  error,
  success,
  getActorFromContext,
  getDocumentBreadcrumb,
  getPublicShareUrlForCollection,
  getPublicShareUrlForDocument,
  pathToUrl,
  withTracing,
} from "../util";

const SELF_TOKENS = new Set(["self", "me", "current_user"]);

/** Fits most MCP client result limits, even for CJK text at about one token per character. */
const DEFAULT_TEXT_LIMIT = 16_000;

/**
 * Returns one page of a long text. The page ends after a line break where
 * possible so that a markdown line is not split between pages, and never
 * splits a surrogate pair.
 *
 * @param text - the full text.
 * @param range - the UTF-16 index to start from and the maximum number of code points to return.
 * @returns the page text, and the next page offset and full text length if more text remains.
 */
function paginateText(
  text: string,
  { offset, limit }: { offset: number; limit: number }
) {
  // A code point is at most two UTF-16 units, so this slice holds a full page.
  let page = TextHelper.truncate(text.slice(offset, offset + limit * 2), limit);
  if (offset + page.length < text.length) {
    const lineEnd = page.lastIndexOf("\n");
    if (lineEnd > 0) {
      page = page.slice(0, lineEnd + 1);
    }
  }
  const end = offset + page.length;

  return {
    text: page,
    ...(end < text.length && { nextOffset: end, textLength: text.length }),
  };
}

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
  const canReadTemplates = AuthenticationHelper.canAccess(
    "templates.info",
    scopes
  );

  if (
    !canReadDocuments &&
    !canReadCollections &&
    !canReadUsers &&
    !canReadAttachments &&
    !canReadTemplates
  ) {
    return;
  }

  const allowedTypes = [
    ...(canReadDocuments ? ["document"] : []),
    ...(canReadCollections ? ["collection"] : []),
    ...(canReadUsers ? ["user"] : []),
    ...(canReadAttachments ? ["attachment"] : []),
    ...(canReadTemplates ? ["template"] : []),
  ] as [string, ...string[]];

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        'Fetches a document, collection, user, attachment, or template by type and ID. When fetching a collection the response includes the full hierarchical document tree. For users, "current_user" can be used as the ID to get the authenticated user. For attachments, the response includes a short-lived signed URL that can be used to download the file contents directly. For templates, the response includes the template body as markdown. Document and template text is returned in pages: when the response includes nextOffset, call fetch again with offset set to that value to read the next page.',
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      inputSchema: z.object({
        resource: z.enum(allowedTypes).describe("The resource to fetch."),
        id: z
          .string()
          .describe(
            'The unique identifier or URL. For users, "current_user" returns the authenticated user.'
          ),
        offset: z.coerce
          .number()
          .int()
          .min(0)
          .default(0)
          .describe(
            "For documents and templates, the character offset to start reading text from. Use nextOffset from the previous response. Defaults to 0."
          ),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(100_000)
          .default(DEFAULT_TEXT_LIMIT)
          .describe(
            `For documents and templates, the maximum number of text characters to return. Defaults to ${DEFAULT_TEXT_LIMIT}, max 100000.`
          ),
      }),
    },
    withTracing("fetch", async ({ resource, id: rawId, ...range }, extra) => {
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

            const [{ text, ...attributes }, breadcrumb, shareUrl] =
              await Promise.all([
                presentDocument(document, {
                  includeData: false,
                  includeText: true,
                  includeUpdatedAt: true,
                  includeCommentCount: true,
                }),
                getDocumentBreadcrumb(document, actor),
                getPublicShareUrlForDocument(actor.team, document.id),
              ]);
            const page = paginateText(
              typeof text === "string" ? text : "",
              range
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    document: pathToUrl(actor.team, attributes),
                    ...(breadcrumb !== undefined && { breadcrumb }),
                    ...(shareUrl !== undefined && { shareUrl }),
                    textLength: page.textLength,
                    nextOffset: page.nextOffset,
                  }),
                },
                {
                  type: "text" as const,
                  text: page.text,
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

            const [presented, shareUrl] = await Promise.all([
              presentCollection(collection),
              getPublicShareUrlForCollection(actor.team, collection.id),
            ]);
            const metadata = {
              ...pathToUrl(actor.team, presented),
              ...(shareUrl !== undefined && { shareUrl }),
            };

            // Admins can read private collection metadata without access to its documents.
            if (!can(actor, "readDocument", collection)) {
              return success(metadata);
            }

            return success([
              metadata,
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

          case "template": {
            const template = await Template.findByPk(id, {
              userId: actor.id,
              rejectOnEmpty: true,
            });

            authorize(actor, "read", template);

            const page = paginateText(
              template.content
                ? await DocumentHelper.toMarkdown(template.content, {
                    includeTitle: false,
                  })
                : "",
              range
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    ...pathToUrl(actor.team, presentTemplate(template)),
                    textLength: page.textLength,
                    nextOffset: page.nextOffset,
                  }),
                },
                {
                  type: "text" as const,
                  text: page.text,
                },
              ],
            } satisfies CallToolResult;
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
