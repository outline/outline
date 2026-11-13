import { PersonalCollectionId } from "@shared/constants";
import { createContext } from "@server/context";
import { Collection } from "@server/models";
import { authorize } from "@server/policies";
import { sequelize } from "@server/storage/database";
import type { APIContext } from "@server/types";

/**
 * Loads the personal collection of the acting user, and creates it when the
 * user does not have one yet.
 *
 * @param ctx the API context containing the acting user.
 * @returns the personal collection, with the memberships of the user loaded.
 * @throws AuthorizationError when the collection does not exist and the user
 * may not create it.
 */
export default async function personalCollectionLoader(
  ctx: APIContext
): Promise<Collection> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  const existing = await Collection.findPersonal(user, { transaction });
  if (existing) {
    return existing;
  }

  authorize(user, "createPersonalCollection", user.team);

  if (transaction) {
    return Collection.findOrCreatePersonal(ctx);
  }

  // The creation lock is only held inside a transaction.
  return sequelize.transaction((innerTransaction) =>
    Collection.findOrCreatePersonal(
      createContext({
        user,
        authType: ctx.state.auth.type,
        ip: ctx.context.ip,
        transaction: innerTransaction,
      })
    )
  );
}

/**
 * Resolves the collectionId "personal" to the id of the personal collection of
 * the acting user, which is created when it does not exist yet. Other values
 * are returned unchanged.
 *
 * @param ctx the API context containing the acting user.
 * @param collectionId the requested collectionId.
 * @returns the resolved collectionId.
 * @throws AuthorizationError when the collection does not exist and the user
 * may not create it.
 */
export async function resolvePersonalCollectionId<
  T extends string | null | undefined,
>(ctx: APIContext, collectionId: T): Promise<T | string> {
  return collectionId === PersonalCollectionId
    ? (await personalCollectionLoader(ctx)).id
    : collectionId;
}
