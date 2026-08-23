import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { Collection } from "@server/models";
import DuplicateCollectionDocumentsTask from "@server/queues/tasks/DuplicateCollectionDocumentsTask";
import type { APIContext } from "@server/types";

type Props = {
  /** The collection to duplicate */
  collection: Collection;
  /** Override of the duplicated collection name */
  name?: string;
};

/**
 * Duplicates a collection into a new collection owned by the acting user. The
 * published documents within the collection are duplicated asynchronously by a
 * background task once the new collection is committed.
 *
 * @param ctx the API context containing the acting user and transaction.
 * @param props the collection to duplicate and optional overrides.
 * @returns the duplicated collection.
 */
export default async function collectionDuplicator(
  ctx: APIContext,
  { collection, name }: Props
): Promise<Collection> {
  const { user } = ctx.state.auth;
  const { transaction } = ctx.state;

  const duplicated = Collection.build({
    name: name ?? collection.name,
    content: collection.content,
    description: collection.description,
    icon: collection.icon,
    color: collection.color,
    teamId: user.teamId,
    createdById: user.id,
    permission: collection.permission,
    sharing: collection.sharing,
    sort: collection.sort,
    commenting: collection.commenting,
    templateManagement: collection.templateManagement,
    sourceMetadata: {
      ...collection.sourceMetadata,
      originalCollectionId: collection.id,
    },
  });

  await duplicated.saveWithCtx(ctx);

  const scheduleTask = () =>
    new DuplicateCollectionDocumentsTask().schedule({
      collectionId: duplicated.id,
      originalCollectionId: collection.id,
      actorId: user.id,
      ip: ctx.context.ip ?? null,
    });

  if (transaction) {
    transaction.afterCommit(async () => {
      try {
        await scheduleTask();
      } catch (err) {
        Logger.error(
          "Failed to schedule duplicate collection documents task",
          toError(err),
          {
            collectionId: duplicated.id,
          }
        );
      }
    });
  } else {
    await scheduleTask();
  }

  // we must reload the collection to get memberships for policy presenter
  return Collection.findByPk(duplicated.id, {
    userId: user.id,
    transaction,
    rejectOnEmpty: true,
  });
}
