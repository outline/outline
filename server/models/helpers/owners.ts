import { difference, uniq } from "es-toolkit";
import { Op } from "sequelize";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import User from "@server/models/User";
import type { Context } from "@server/types";

/**
 * Validates the requested owners of a document or collection, added owners
 * must be active members or admins of the acting user's workspace. Existing
 * owners are kept without validation so that the list can still be changed.
 *
 * @param ctx the API context containing the acting user.
 * @param ownerIds the requested owner IDs.
 * @param previousOwnerIds the owner IDs before the change.
 * @param maxOwners the maximum number of owners.
 * @returns the de-duplicated owner IDs.
 * @throws ValidationError when there are too many owners, or any of the added
 * users cannot be an owner.
 */
export async function validateOwnerIds(
  ctx: Context,
  ownerIds: string[],
  previousOwnerIds: string[],
  maxOwners: number
): Promise<string[]> {
  const { user } = ctx.auth;
  const { transaction } = ctx;
  const ids = uniq(ownerIds);
  const addedIds = difference(ids, previousOwnerIds);

  if (ids.length > maxOwners) {
    throw ValidationError(`There can be at most ${maxOwners} owners`);
  }

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
      "Owners must be active members or admins of the workspace"
    );
  }

  return ids;
}

/**
 * Validates the requested owners and returns them when they differ from the
 * current owners, so that the caller can authorize the change before it is
 * assigned.
 *
 * @param ctx the API context containing the acting user.
 * @param currentOwnerIds the current owner IDs.
 * @param ownerIds the requested owner IDs.
 * @param maxOwners the maximum number of owners.
 * @returns the owner IDs to assign, or undefined when they are unchanged.
 * @throws ValidationError when any of the owners are not valid.
 */
export async function resolveOwnerIds(
  ctx: Context,
  currentOwnerIds: string[],
  ownerIds: string[],
  maxOwners: number
): Promise<string[] | undefined> {
  const validated = await validateOwnerIds(
    ctx,
    ownerIds,
    currentOwnerIds,
    maxOwners
  );
  const isChanged =
    validated.length !== currentOwnerIds.length ||
    validated.some((id) => !currentOwnerIds.includes(id));

  return isChanged ? validated : undefined;
}

/**
 * Lists the owners that were added and removed between two lists of owners.
 *
 * @param previous the owner IDs before the change.
 * @param current the owner IDs after the change.
 * @returns the event name and user ID for each changed owner.
 */
export function ownerChanges(
  previous: string[],
  current: string[]
): { name: "add_owner" | "remove_owner"; userId: string }[] {
  return [
    ...difference(current, previous).map((userId) => ({
      name: "add_owner" as const,
      userId,
    })),
    ...difference(previous, current).map((userId) => ({
      name: "remove_owner" as const,
      userId,
    })),
  ];
}
