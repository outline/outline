import { Transaction, Op } from "sequelize";
import Logger from "@server/logging/Logger";
import { traceFunction } from "@server/logging/tracing";
import {
  Collection,
  Document,
  UserMembership,
  GroupMembership,
  CollectionMergeRequest,
  MergeRequestStatus,
} from "@server/models";
import type { APIContext } from "@server/types";
import { generateUrlId } from "@server/utils/url";

type Props = {
  /** Merge request to process */
  mergeRequest: CollectionMergeRequest;
  /** User performing the merge */
  user: any;
  /** Transaction context */
  transaction: Transaction;
};

type Result = {
  mergedCollection: Collection;
  sourceCollections: Collection[];
  documents: Document[];
};

/**
 * Merges multiple collections into one.
 * Preserves all memberships and documents from source collections.
 */
async function collectionMerger(
  ctx: APIContext,
  { mergeRequest, user, transaction }: Props
): Promise<Result> {
  const { sourceCollectionIds, newCollectionName, targetCollectionId } =
    mergeRequest;

  // Load all source collections
  // Load all source collections
  const sourceCollections = await Collection.scope("withDocumentStructure").findAll({
    where: {
      id: sourceCollectionIds,
      teamId: user.teamId,
    },
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });

  if (sourceCollections.length === 0) {
    throw new Error("No source collections found");
  }

  // Determine target collection
  let targetCollection: Collection;
  if (targetCollectionId) {
    // Merge into existing collection
    targetCollection = await Collection.findByPk(targetCollectionId, {
      includeDocumentStructure: true,
      transaction,
      lock: Transaction.LOCK.UPDATE,
      rejectOnEmpty: true,
    });

    // Update name if provided
    if (newCollectionName && newCollectionName !== targetCollection.name) {
      targetCollection.name = newCollectionName;
    }
  } else {
    // Create new collection
    const firstCollection = sourceCollections[0];

    // Inherit the most permissive settings from source collections
    const sharing = sourceCollections.some((c) => c.sharing);
    const commenting = sourceCollections.some((c) => c.commenting);

    targetCollection = Collection.build({
      name: newCollectionName,
      teamId: user.teamId,
      createdById: user.id,
      icon: firstCollection.icon,
      color: firstCollection.color,
      permission: firstCollection.permission, // Defaulting to first, but we could also pick most permissive
      sharing,
      commenting,
      sort: firstCollection.sort,
      urlId: generateUrlId(),
    });

    await targetCollection.saveWithCtx(ctx, {
      transaction,
    });
  }

  const result: Result = {
    mergedCollection: targetCollection,
    sourceCollections,
    documents: [],
  };

  // Move all documents (published, drafts, archived) from source collections to target in bulk
  await Document.update(
    {
      collectionId: targetCollection.id,
      lastModifiedById: user.id,
    },
    {
      where: {
        collectionId: sourceCollectionIds,
      },
      transaction,
    }
  );

  // After bulk update, handle the structure merging
  // We fetch all top-level documents in the target collection
  const topLevelDocuments = await Document.findAll({
    where: {
      collectionId: targetCollection.id,
      parentDocumentId: null,
    },
    transaction,
    order: [["title", "ASC"]],
  });

  for (const document of topLevelDocuments) {
    result.documents.push(document);

    // Add to target collection structure if not already there
    // addDocumentToStructure handles duplication checks internally
    const documentJson = await document.toNavigationNode({ transaction });
    await targetCollection.addDocumentToStructure(document, undefined, {
      documentJson,
      transaction,
      save: false,
    });
  }

  // Handle memberships for each source collection
  for (const sourceCollection of sourceCollections) {
    // Copy memberships from source to target
    // User memberships
    const userMemberships = await UserMembership.findAll({
      where: {
        collectionId: sourceCollection.id,
      },
      transaction,
    });

    for (const membership of userMemberships) {
      // Check if user already has membership in target
      const existing = await UserMembership.findOne({
        where: {
          collectionId: targetCollection.id,
          userId: membership.userId,
        },
        transaction,
      });

      if (!existing) {
        await UserMembership.create(
          {
            collectionId: targetCollection.id,
            userId: membership.userId,
            permission: membership.permission,
            createdById: user.id,
          },
          { transaction, hooks: false }
        );
      } else {
        // Update to most permissive if already exists
        const permissions = ["read", "read_write", "admin"];
        if (permissions.indexOf(membership.permission) > permissions.indexOf(existing.permission)) {
          existing.permission = membership.permission;
          await existing.save({ transaction, hooks: false });
        }
      }
    }

    // Group memberships
    const groupMemberships = await GroupMembership.findAll({
      where: {
        collectionId: sourceCollection.id,
      },
      transaction,
    });

    for (const membership of groupMemberships) {
      // Check if group already has membership in target
      const existing = await GroupMembership.findOne({
        where: {
          collectionId: targetCollection.id,
          groupId: membership.groupId,
        },
        transaction,
      });

      if (!existing) {
        await GroupMembership.create(
          {
            collectionId: targetCollection.id,
            groupId: membership.groupId,
            permission: membership.permission,
            createdById: user.id,
          },
          { transaction, hooks: false }
        );
      } else {
        // Update to most permissive if already exists
        const permissions = ["read", "read_write", "admin"];
        if (permissions.indexOf(membership.permission) > permissions.indexOf(existing.permission)) {
          existing.permission = membership.permission;
          await existing.save({ transaction, hooks: false });
        }
      }
    }
  }

  // Handle collaborative state and content to prevent inconsistencies
  // Clear state to force fresh regeneration on next collaborative session
  const hadState = !!targetCollection.state;
  targetCollection.state = null;

  // If target collection has no content, preserve content from first source collection
  if (!targetCollection.content && sourceCollections.length > 0) {
    const firstSource = sourceCollections[0];
    if (firstSource.content) {
      targetCollection.content = firstSource.content;
      targetCollection.description = firstSource.description;

      Logger.info(
        "multiplayer",
        "Preserved content from source collection during merge",
        {
          targetCollectionId: targetCollection.id,
          sourceCollectionId: firstSource.id,
        }
      );
    }
  }

  Logger.info("multiplayer", "Collection merge state handling completed", {
    targetCollectionId: targetCollection.id,
    sourceCollectionIds: sourceCollections.map((c) => c.id),
    stateCleared: hadState,
    contentPreserved: !!targetCollection.content,
  });

  // Save target collection
  await targetCollection.save({ transaction });

  // Archive source collections (soft delete)
  for (const sourceCollection of sourceCollections) {
    if (sourceCollection.id !== targetCollection.id) {
      // @ts-expect-error context missing from destroy options type
      await sourceCollection.destroy({ transaction, auth: { user } });
    }
  }

  // Update merge request status
  mergeRequest.status = MergeRequestStatus.Completed;
  await mergeRequest.save({ transaction });

  return result;
}

export default traceFunction({
  spanName: "collectionMerger",
})(collectionMerger);
