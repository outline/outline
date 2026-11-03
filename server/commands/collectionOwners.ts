import { difference } from "es-toolkit";
import { Sequelize } from "sequelize";
import { CollectionPermission } from "@shared/types";
import { CollectionValidation } from "@shared/validations";
import { Collection, Event, UserMembership } from "@server/models";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import { validateOwnerIds } from "./owners";

/**
 * Validates the requested owners of a collection, and authorizes the acting
 * user to change them when they differ from the current owners.
 *
 * @param ctx the API context containing the acting user.
 * @param collection the collection to change the owners of.
 * @param ownerIds the requested owner IDs.
 * @returns the owner IDs to assign, or the current owner IDs when unchanged.
 * @throws ValidationError when any of the owners are not valid.
 * @throws AuthorizationError when the user cannot change the owners.
 */
export async function resolveCollectionOwnerIds(
  ctx: APIContext,
  collection: Collection,
  ownerIds: string[]
): Promise<string[]> {
  const previousOwnerIds = collection.ownerIds ?? [];
  const validatedOwnerIds = await validateOwnerIds(
    ctx,
    ownerIds,
    previousOwnerIds,
    CollectionValidation.maxOwners
  );
  const isChanged =
    validatedOwnerIds.length !== previousOwnerIds.length ||
    validatedOwnerIds.some((id) => !previousOwnerIds.includes(id));

  if (!isChanged) {
    return previousOwnerIds;
  }

  authorize(ctx.state.auth.user, "manageOwners", collection);
  return validatedOwnerIds;
}

/**
 * Records events for changed owners of a saved collection, and gives added
 * owners the manage permission.
 *
 * @param ctx the API context containing the acting user.
 * @param collection the collection with its new owners.
 * @param previousOwnerIds the owner IDs before the change.
 * @returns a promise that resolves once the changes are recorded.
 */
export async function applyCollectionOwnerChanges(
  ctx: APIContext,
  collection: Collection,
  previousOwnerIds: string[]
): Promise<void> {
  const ownerIds = collection.ownerIds ?? [];
  const added = difference(ownerIds, previousOwnerIds);
  const removed = difference(previousOwnerIds, ownerIds);

  for (const userId of added) {
    await createCollectionOwnerEvent(ctx, collection, "add", userId);
  }

  for (const userId of removed) {
    await createCollectionOwnerEvent(ctx, collection, "remove", userId);
  }

  await grantCollectionOwnerAccess(ctx, collection, added);
}

/**
 * Changes the owners of a collection, giving added owners the manage
 * permission.
 *
 * @param ctx the API context containing the acting user.
 * @param collection the collection to change the owners of.
 * @param ownerIds the requested owner IDs.
 * @returns a promise that resolves once the owners are saved.
 * @throws ValidationError when any of the owners are not valid.
 * @throws AuthorizationError when the user cannot change the owners.
 */
export async function updateCollectionOwners(
  ctx: APIContext,
  collection: Collection,
  ownerIds: string[]
): Promise<void> {
  const previousOwnerIds = collection.ownerIds ?? [];
  const nextOwnerIds = await resolveCollectionOwnerIds(
    ctx,
    collection,
    ownerIds
  );

  if (nextOwnerIds === previousOwnerIds) {
    return;
  }

  collection.ownerIds = nextOwnerIds;
  await collection.saveWithCtx(ctx);
  await applyCollectionOwnerChanges(ctx, collection, previousOwnerIds);
}

/**
 * Gives users the manage permission on a collection when they are made
 * owners. The acting user is skipped, as they can already manage the
 * collection.
 *
 * @param ctx the API context containing the acting user.
 * @param collection the collection that the users own.
 * @param userIds the IDs of the added owners.
 * @returns a promise that resolves once the memberships are saved.
 */
export async function grantCollectionOwnerAccess(
  ctx: APIContext,
  collection: Collection,
  userIds: string[]
): Promise<void> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  for (const userId of userIds) {
    if (userId === user.id) {
      continue;
    }

    const membership = await UserMembership.findOneForUpdate(
      { userId, collectionId: collection.id },
      { transaction }
    );

    if (!membership) {
      await UserMembership.createWithCtx(ctx, {
        userId,
        collectionId: collection.id,
        permission: CollectionPermission.Admin,
        createdById: user.id,
      });
      continue;
    }

    membership.permission = CollectionPermission.Admin;
    if (membership.changed()) {
      await membership.save(ctx.context);
    }
  }
}

/**
 * Removes a user from the owners of a collection, used when their access to
 * the collection is reduced or removed.
 *
 * @param ctx the API context containing the acting user.
 * @param collection the collection to remove the owner from.
 * @param userId the ID of the user to remove.
 * @returns a promise that resolves once the owner is removed.
 */
export async function removeCollectionOwner(
  ctx: APIContext,
  collection: Collection,
  userId: string
): Promise<void> {
  const previousOwnerIds = collection.ownerIds ?? [];
  if (!previousOwnerIds.includes(userId)) {
    return;
  }

  await Collection.unscoped().update(
    {
      ownerIds: Sequelize.fn("array_remove", Sequelize.col("ownerIds"), userId),
    },
    {
      where: { id: collection.id },
      paranoid: false,
      silent: true,
      transaction: ctx.state.transaction,
    }
  );

  collection.ownerIds = previousOwnerIds.filter((id) => id !== userId);
  await createCollectionOwnerEvent(ctx, collection, "remove", userId);
}

async function createCollectionOwnerEvent(
  ctx: APIContext,
  collection: Collection,
  change: "add" | "remove",
  userId: string
) {
  await Event.createFromContext(ctx, {
    name:
      change === "add" ? "collections.add_owner" : "collections.remove_owner",
    collectionId: collection.id,
    modelId: collection.id,
    userId,
  });
}
