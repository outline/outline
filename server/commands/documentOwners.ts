import { difference, uniq } from "es-toolkit";
import { Op } from "sequelize";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import { Event, User } from "@server/models";
import type Document from "@server/models/Document";
import type { APIContext } from "@server/types";

/**
 * Validates the requested owners of a document, owners must be active members
 * or admins of the acting user's workspace.
 *
 * @param ctx the API context containing the acting user.
 * @param ownerIds the requested owner IDs.
 * @returns the de-duplicated owner IDs.
 * @throws ValidationError when any of the users cannot be an owner.
 */
export async function validateDocumentOwnerIds(
  ctx: APIContext,
  ownerIds: string[]
): Promise<string[]> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const ids = uniq(ownerIds);

  if (ids.length === 0) {
    return ids;
  }

  const count = await User.count({
    where: {
      id: ids,
      teamId: user.teamId,
      role: { [Op.in]: [UserRole.Admin, UserRole.Member] },
      suspendedAt: { [Op.is]: null },
    },
    transaction,
  });

  if (count !== ids.length) {
    throw ValidationError(
      "Document owners must be active members or admins of the workspace"
    );
  }

  return ids;
}

/**
 * Records events for owners that were added to or removed from a document.
 *
 * @param ctx the API context containing the acting user.
 * @param document the document with its new owners.
 * @param previousOwnerIds the owner IDs before the change.
 * @returns a promise that resolves once the events are created.
 */
export async function createDocumentOwnerEvents(
  ctx: APIContext,
  document: Document,
  previousOwnerIds: string[]
): Promise<void> {
  const ownerIds = document.ownerIds ?? [];
  const added = difference(ownerIds, previousOwnerIds);
  const removed = difference(previousOwnerIds, ownerIds);

  for (const userId of added) {
    await Event.createFromContext(ctx, {
      name: "documents.add_owner",
      documentId: document.id,
      collectionId: document.collectionId,
      modelId: document.id,
      userId,
    });
  }

  for (const userId of removed) {
    await Event.createFromContext(ctx, {
      name: "documents.remove_owner",
      documentId: document.id,
      collectionId: document.collectionId,
      modelId: document.id,
      userId,
    });
  }
}
