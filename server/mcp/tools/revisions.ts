import isEqual from "fast-deep-equal";
import { Op, type WhereOptions } from "sequelize";
import { isUUID } from "validator";
import { z } from "zod";
import type { McpServer, CallToolResult } from "@modelcontextprotocol/server";
import AuthenticationHelper from "@shared/helpers/AuthenticationHelper";
import { NotFoundError, ValidationError } from "@server/errors";
import { Document, Revision, User } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { authorize } from "@server/policies";
import {
  error,
  getActorFromContext,
  optionalString,
  pathToUrl,
  withTracing,
} from "../util";

/**
 * Registers revision-related MCP tools on the given server, filtered by the
 * OAuth scopes granted to the current token.
 *
 * @param server - the MCP server instance to register tools on.
 * @param scopes - the OAuth scopes granted to the access token.
 */
export function revisionTools(server: McpServer, scopes: string[]) {
  if (
    !AuthenticationHelper.canAccess("revisions.list", scopes) ||
    !AuthenticationHelper.canAccess("revisions.info", scopes)
  ) {
    return;
  }

  server.registerTool(
    "get_document_changes",
    {
      title: "Get document changes",
      description: `Shows what changed in a document between two points in its history, and who changed it. Returns the revisions in the range with their authors, followed by a unified diff of the document markdown. Lines starting with "-" were removed and lines starting with "+" were added. Added and unchanged lines are verbatim markdown of the newer version, so when the range ends at the current document they can be used as findText with update_document in "patch" mode. Use this before editing a document that others may have changed, to review and merge their changes.`,
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      inputSchema: {
        id: z.string().describe("The unique identifier of the document."),
        from: z
          .union([
            z.uuid(),
            z.iso.datetime({ offset: true }),
            z.iso.date(),
            z.literal(MyLastEdit),
          ])
          .describe(
            `Where the changes start. One of: a revision ID from a previous call, an ISO 8601 date or timestamp with a time zone, or "${MyLastEdit}" for the point after the current user's latest edit.`
          ),
        to: optionalString().describe(
          "A revision ID where the changes end. Defaults to the current document, including edits that are not yet saved as a revision."
        ),
      },
    },
    withTracing("get_document_changes", async ({ id, from, to }, extra) => {
      try {
        const actor = getActorFromContext(extra);

        const document = await Document.findByPk(id, {
          userId: actor.id,
          paranoid: false,
          rejectOnEmpty: true,
        });
        authorize(actor, "listRevisions", document);

        // History remains visible for a document in the trash,
        // but only to those that could restore it.
        if (document.deletedAt) {
          authorize(actor, "restore", document);
        }

        const [start, end] = await Promise.all([
          resolveStart(document, actor, from, !to),
          to ? findRevision(document, to) : null,
        ]);
        const startedAt =
          start instanceof Document
            ? start.updatedAt
            : (start?.createdAt ?? parseTimestamp(from));

        // Bound history to the loaded document so that edits saved during
        // this request cannot appear in the list but not in the diff.
        const endedAt = end?.createdAt ?? document.updatedAt;

        if (startedAt && startedAt > endedAt) {
          throw ValidationError("from must be earlier than to");
        }

        const after = end ?? document;
        const where: WhereOptions<Revision> = {
          documentId: document.id,
          createdAt: {
            ...(startedAt && { [Op.gt]: startedAt }),
            [Op.lte]: endedAt,
          },
        };

        const [revisions, revisionCount, latest] = await Promise.all([
          Revision.findAll({
            attributes: {
              exclude: ["content", "text"],
            },
            where,
            order: [["createdAt", "DESC"]],
            limit: MaxRevisions,
          }),
          Revision.count({ where }),
          end ? null : Revision.findAt(document.id, document.updatedAt),
        ]);

        const diff = DocumentHelper.toMarkdownDiff(start, after);

        // The newest edits are saved as a revision after a delay, so the
        // current document can be ahead of the latest revision.
        const hasUnsavedEdits =
          !end &&
          (!latest ||
            latest.title !== document.title ||
            !isEqual(latest.content, document.content));

        const presentedRevisions = await presentRevisions(
          document.teamId,
          revisions.reverse()
        );
        const tooLarge = diff === undefined;
        const truncated = !!diff && diff.length > MaxDiffLength;
        const titleChanged = (start?.title ?? "") !== after.title;

        let diffText = diff || "No changes to the document content.";
        if (tooLarge) {
          diffText =
            "The changes are too large to show as a diff, use a shorter range or fetch the document.";
        } else if (truncated) {
          diffText = `${diff.slice(0, MaxDiffLength)}\n[Diff truncated, use a shorter range to see all changes]`;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                document: pathToUrl(actor.team, {
                  id: document.id,
                  title: document.title,
                  url: document.path,
                }),
                from:
                  start instanceof Revision
                    ? { revisionId: start.id, createdAt: start.createdAt }
                    : {
                        revisionId: null,
                        ...(start && { current: true }),
                        createdAt: startedAt ?? null,
                      },
                to: end
                  ? { revisionId: end.id, createdAt: end.createdAt }
                  : {
                      revisionId: null,
                      current: true,
                      updatedAt: document.updatedAt,
                      ...(hasUnsavedEdits && {
                        unsavedEditsBy: presentUser(document.updatedBy),
                      }),
                    },
                ...(titleChanged && {
                  title: { before: start?.title ?? null, after: after.title },
                }),
                revisions: presentedRevisions,
                revisionCount,
                hasChanges: tooLarge || !!diff || titleChanged,
                ...(truncated && { truncated: true }),
                ...(tooLarge && { tooLarge: true }),
              }),
            },
            {
              type: "text" as const,
              text: diffText,
            },
          ],
        } satisfies CallToolResult;
      } catch (err) {
        return error(err);
      }
    })
  );
}

/** The `from` value that selects the latest revision by the current user. */
const MyLastEdit = "my_last_edit";

/** The maximum number of revisions listed in a response. */
const MaxRevisions = 25;

/** The maximum number of diff characters returned in a response. */
const MaxDiffLength = 50_000;

/**
 * Finds a revision that belongs to the document.
 *
 * @param document - the document the revision must belong to.
 * @param id - the revision ID.
 * @returns the revision.
 * @throws NotFoundError if the revision does not exist on the document.
 */
async function findRevision(document: Document, id: string) {
  const revision = await Revision.findByIdForDocument(id, document.id);
  if (!revision) {
    throw NotFoundError("Revision not found");
  }

  return revision;
}

/**
 * Resolves the state of the document to compare from.
 *
 * @param document - the document to find the state for.
 * @param actor - the current user.
 * @param from - a revision ID, an ISO 8601 timestamp, or "my_last_edit".
 * @param allowCurrent - whether the current document can be the start.
 * @returns the revision or current document, or null when the document had
 * no revision at the given time.
 * @throws ValidationError if the current user has no revisions to start from.
 * @throws NotFoundError if the revision does not exist on the document.
 */
async function resolveStart(
  document: Document,
  actor: User,
  from: string,
  allowCurrent: boolean
): Promise<Document | Revision | null> {
  if (from === MyLastEdit) {
    // The latest edit may not be saved as a revision yet, so when it is the
    // current user's, the current document is the state after it.
    if (allowCurrent && document.lastModifiedById === actor.id) {
      return document;
    }

    const revision = await Revision.findLatestByUser(document.id, actor.id);
    if (!revision) {
      throw ValidationError(
        "The current user has no revisions on this document"
      );
    }
    return revision;
  }

  if (isUUID(from)) {
    return findRevision(document, from);
  }

  // Edits may not be saved as a revision yet, so a time after the latest edit
  // is the current document.
  const date = new Date(from);
  if (allowCurrent && date >= document.updatedAt) {
    return document;
  }

  return Revision.findAt(document.id, date);
}

/**
 * Parses an ISO 8601 timestamp.
 *
 * @param value - the value to parse.
 * @returns the date, or undefined when the value is not a timestamp.
 */
function parseTimestamp(value: string) {
  return isUUID(value) || value === MyLastEdit ? undefined : new Date(value);
}

/**
 * Presents a user with only the fields needed to attribute a change.
 *
 * @param user - the user to present.
 * @returns the user ID and name.
 */
function presentUser(user: User | null | undefined) {
  return user ? { id: user.id, name: user.name } : null;
}

/**
 * Presents revisions with their author and collaborators, loading all
 * collaborators in a single query.
 *
 * @param teamId - the team the revisions belong to.
 * @param revisions - the revisions to present.
 * @returns the presented revisions.
 */
async function presentRevisions(teamId: string, revisions: Revision[]) {
  const collaboratorIds = new Set(
    revisions.flatMap((revision) => revision.collaboratorIds ?? [])
  );
  const collaborators = collaboratorIds.size
    ? await User.findAll({
        attributes: ["id", "name"],
        where: { id: Array.from(collaboratorIds), teamId },
        paranoid: false,
      })
    : [];
  const usersById = new Map(collaborators.map((user) => [user.id, user]));

  return revisions.map((revision) => ({
    id: revision.id,
    name: revision.name,
    createdAt: revision.createdAt,
    author: presentUser(revision.user),
    collaborators: (revision.collaboratorIds ?? [])
      .filter((userId) => userId !== revision.userId)
      .map((userId) => presentUser(usersById.get(userId)))
      .filter(Boolean),
  }));
}
