import { z } from "zod";
import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Op } from "sequelize";
import type { WhereOptions } from "sequelize";
import { Collection, Template } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import {
  error,
  success,
  getActorFromContext,
  optionalString,
  pathToUrl,
  withTracing,
} from "./util";

/**
 * Presents a template's metadata and rendered markdown body for a tool
 * response. Including the body lets a caller list templates and create a
 * document from one — verbatim or adapted — without a separate fetch call.
 *
 * @param template - the template to present.
 * @returns the presented template with its body as markdown.
 */
export async function presentTemplate(template: Template) {
  return {
    id: template.id,
    url: template.path,
    title: template.title,
    collectionId: template.collectionId ?? null,
    updatedAt: template.updatedAt,
    text: template.content
      ? await DocumentHelper.toMarkdown(template.content, {
          includeTitle: false,
        })
      : "",
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
          "Lists document templates the user has access to, including workspace-wide templates and templates within accessible collections. Each result includes the template body as markdown. To create a document from a template unchanged, pass its ID as templateId to create_document. To adapt it first, modify the returned text and pass it as the text parameter to create_document — no separate fetch is needed.",
        annotations: {
          idempotentHint: true,
          readOnlyHint: true,
        },
        inputSchema: {
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
        },
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
              [Op.and]: [{ deletedAt: { [Op.eq]: null } }],
            };

            if (collectionId) {
              const collection = await Collection.findByPk(collectionId, {
                userId: user.id,
              });
              authorize(user, "read", collection);
              where[Op.and].push({ collectionId });
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

            const presented = await Promise.all(
              templates.map(async (template) =>
                pathToUrl(user.team, await presentTemplate(template))
              )
            );
            return success(presented);
          } catch (message) {
            return error(message);
          }
        }
      )
    );
  }
}
