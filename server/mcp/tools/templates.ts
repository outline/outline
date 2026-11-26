import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { Op } from "sequelize";
import type { WhereOptions } from "sequelize";
import { Collection, Template } from "@server/models";
import { authorize } from "@server/policies";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  getActorFromContext,
  optionalString,
  pathToUrl,
  withTracing,
} from "../util";

/**
 * Presents a template's metadata for a tool response.
 *
 * @param template - the template to present.
 * @returns the presented template metadata.
 */
export function presentTemplate(template: Template) {
  return {
    id: template.id,
    url: template.path,
    title: template.title,
    collectionId: template.collectionId ?? null,
    updatedAt: template.updatedAt,
  };
}

/**
 * Registers template-related MCP tools on the given server, filtered by the
 * OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function templateTools(server: McpServer, scopes: string[]) {
  if (AuthenticationHelper.canAccess("templates.list", scopes)) {
    server.registerTool(
      "list_templates",
      {
        title: "List templates",
        description:
          'Lists document templates the user has access to, including workspace-wide templates and templates within accessible collections. To create a document from a template unchanged, pass its ID as templateId to create_document. To read or adapt the template body, use fetch with resource "template", then pass the modified text as the text parameter to create_document.',
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
          readOnlyHint: true,
        },
        inputSchema: z.object({
          collectionId: optionalString().describe(
            "A collection ID to filter templates by. Omit to include workspace-wide templates and templates from all accessible collections."
          ),
          offset: z.coerce
            .number()
            .int()
            .min(0)
            .optional()
            .describe("The pagination offset. Defaults to 0."),
          limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe(
              "The maximum number of results to return. Defaults to 25, max 100."
            ),
        }),
      },
      withTracing(
        "list_templates",
        async ({ collectionId, offset, limit }, extra) => {
          try {
            const user = getActorFromContext(extra);
            const effectiveOffset = offset ?? 0;
            const effectiveLimit = limit ?? 25;

            const where: WhereOptions<Template> & {
              [Op.and]: WhereOptions<Template>[];
            } = {
              teamId: user.teamId,
              [Op.and]: [
                { deletedAt: { [Op.eq]: null } },
                // drafts are only visible to the user that created them
                {
                  [Op.or]: [
                    { publishedAt: { [Op.ne]: null } },
                    { createdById: user.id },
                  ],
                },
              ],
            };

            if (collectionId) {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
              });
              authorize(user, "readDocument", collection);
              where[Op.and].push({ collectionId: collection.id });
            } else {
              where[Op.and].push({
                [Op.or]: [
                  { collectionId: { [Op.eq]: null } },
                  { collectionId: await user.collectionIds() },
                ],
              });
            }

            const templates = await Template.scope([
              "defaultScope",
              { method: ["withMembership", user.id] },
            ]).findAll({
              where,
              order: [["updatedAt", "DESC"]],
              offset: effectiveOffset,
              limit: effectiveLimit,
            });

            return success(
              templates.map((template) =>
                pathToUrl(user.team, presentTemplate(template))
              )
            );
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }
}
