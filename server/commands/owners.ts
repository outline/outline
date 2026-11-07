import { difference, uniq } from "es-toolkit";
import { Op } from "sequelize";
import { UserRole } from "@shared/types";
import { ValidationError } from "@server/errors";
import { User } from "@server/models";
import type { APIContext } from "@server/types";

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
  ctx: APIContext,
  ownerIds: string[],
  previousOwnerIds: string[],
  maxOwners: number
): Promise<string[]> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;
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
