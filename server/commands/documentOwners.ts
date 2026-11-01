import { difference, uniq } from "es-toolkit";
import { Op, Sequelize } from "sequelize";
import { DocumentPermission, UserRole } from "@shared/types";
import { createContext } from "@server/context";
import { ValidationError } from "@server/errors";
import { Document, Event, User, UserMembership } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";

/**
 * Validates the requested owners of a document, added owners must be active
 * members or admins of the acting user's workspace. Existing owners are kept
 * without validation so that the list can still be changed.
 *
 * @param ctx the API context containing the acting user.
 * @param ownerIds the requested owner IDs.
 * @param previousOwnerIds the owner IDs before the change.
 * @returns the de-duplicated owner IDs.
 * @throws ValidationError when any of the added users cannot be an owner.
 */
export async function validateDocumentOwnerIds(
  ctx: APIContext,
  ownerIds: string[],
  previousOwnerIds: string[] = []
): Promise<string[]> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
  const ids = uniq(ownerIds);
  const addedIds = difference(ids, previousOwnerIds);

  if (addedIds.length === 0) {
    return ids;
  }

  const count = await User.count({
    where: {
      id: addedIds,
      teamId: user.teamId,
      role: { [Op.in]: [UserRole.Admin, UserRole.Member] },
      suspendedAt: { [Op.is]: null },
    },
    transaction,
  });

  if (count !== addedIds.length) {
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

/**
 * Gives users the manage permission on a document when they are made owners.
 * The acting user is skipped, as they can already manage the document.
 *
 * @param ctx the API context containing the acting user.
 * @param document the document that the users own.
 * @param userIds the IDs of the added owners.
 * @returns a promise that resolves once the memberships are saved.
 */
export async function grantDocumentOwnerAccess(
  ctx: APIContext,
  document: Document,
  userIds: string[]
): Promise<void> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  // Memberships are locked while they are changed, which needs a transaction.
  if (!transaction) {
    await sequelize.transaction((t) =>
      grantDocumentOwnerAccess(
        createContext({
          user,
          authType: ctx.state.auth.type,
          ip: ctx.context.ip,
          transaction: t,
        }),
        document,
        userIds
      )
    );
    return;
  }

  for (const userId of userIds) {
    if (userId === user.id) {
      continue;
    }

    const membership = await UserMembership.findOneForUpdate(
      { userId, documentId: document.id },
      { transaction }
    );

    if (!membership) {
      await UserMembership.createWithCtx(ctx, {
        userId,
        documentId: document.id,
        permission: DocumentPermission.Admin,
        createdById: user.id,
      });
      continue;
    }

    membership.permission = DocumentPermission.Admin;
    membership.sourceId = null;
    if (membership.changed()) {
      await membership.save(ctx.context);
    }
  }
}

/**
 * Removes a user from the owners of a document, used when their access to the
 * document is reduced or removed.
 *
 * @param ctx the API context containing the acting user.
 * @param document the document to remove the owner from.
 * @param userId the ID of the user to remove.
 * @returns a promise that resolves once the owner is removed.
 */
export async function removeDocumentOwner(
  ctx: APIContext,
  document: Document,
  userId: string
): Promise<void> {
  const previousOwnerIds = document.ownerIds ?? [];
  if (!previousOwnerIds.includes(userId)) {
    return;
  }

  await Document.unscoped().update(
    {
      ownerIds: Sequelize.fn("array_remove", Sequelize.col("ownerIds"), userId),
    },
    {
      where: { id: document.id },
      paranoid: false,
      silent: true,
      transaction: ctx.state.transaction,
    }
  );

  document.ownerIds = previousOwnerIds.filter((id) => id !== userId);
  await createDocumentOwnerEvents(ctx, document, previousOwnerIds);
}
