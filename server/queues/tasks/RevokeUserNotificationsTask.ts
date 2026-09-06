import { Op } from "sequelize";
import { compact, uniq } from "es-toolkit/compat";
import Logger from "@server/logging/Logger";
import {
  Collection,
  Document,
  Event,
  Notification,
  User,
} from "@server/models";
import { can } from "@server/policies";
import { BaseTask, TaskPriority } from "./base/BaseTask";

export type RevokeScope = {
  /** When provided, only notifications for this document, and its nested documents, are considered. */
  documentId?: string;
  /** When provided, only notifications for this collection, and the documents within it, are considered. */
  collectionId?: string;
};

type Props = RevokeScope & {
  /** The user whose notifications should be re-checked. */
  userId: string;
};

/**
 * Destroys the notifications of a user that reference a document or collection they can no longer
 * read, so that the record – which embeds the document title and text – does not outlive access.
 */
export default class RevokeUserNotificationsTask extends BaseTask<Props> {
  public async perform({ userId, documentId, collectionId }: Props) {
    const user = await User.findByPk(userId);

    if (!user) {
      return;
    }

    const notifications = await this.findInScope(userId, {
      documentId,
      collectionId,
    });

    const candidateIds = uniq(
      compact(notifications.map((notification) => notification.documentId))
    );

    // Documents that are no longer visible to the user are not returned by this query at all, in
    // which case the notification is left alone – only a document that exists and is unreadable is
    // grounds for revoking. Naming a scope replaces the default scope, so drafts are included.
    const documents = candidateIds.length
      ? await Document.scope({
          method: ["withMembership", user.id],
        }).findAll({
          // The minimum needed to evaluate the read policy, alongside the memberships and
          // collection loaded by the scope.
          attributes: [
            "id",
            "teamId",
            "collectionId",
            "createdById",
            "publishedAt",
          ],
          where: { id: candidateIds },
        })
      : [];

    const unreadableDocumentIds = new Set(
      documents
        .filter((document) => !can(user, "read", document))
        .map((document) => document.id)
    );

    const revokeIds = notifications
      .filter(
        (notification) =>
          notification.documentId &&
          unreadableDocumentIds.has(notification.documentId)
      )
      .map((notification) => notification.id);

    // Notifications about a collection itself carry no document, so are checked separately.
    const collectionIds = uniq(
      compact(
        notifications
          .filter((notification) => !notification.documentId)
          .map((notification) => notification.collectionId)
      )
    );

    for (const id of collectionIds) {
      const collection = await Collection.findByPk(id, { userId: user.id });
      if (collection && !can(user, "read", collection)) {
        revokeIds.push(
          ...notifications
            .filter(
              (notification) =>
                !notification.documentId && notification.collectionId === id
            )
            .map((notification) => notification.id)
        );
      }
    }

    if (!revokeIds.length) {
      return;
    }

    Logger.debug(
      "task",
      `Revoking ${revokeIds.length} notifications for user ${user.id}`
    );

    await Notification.destroy({ where: { id: revokeIds } });

    // Notify the client so the notification does not linger in the UI until the next reload.
    await Promise.all(
      revokeIds.map((id) =>
        Event.schedule({
          name: "notifications.delete",
          modelId: id,
          userId: user.id,
          teamId: user.teamId,
        })
      )
    );
  }

  public get options() {
    return {
      ...super.options,
      priority: TaskPriority.Background,
    };
  }

  /**
   * Loads the user's notifications that fall within the given scope, joining through the document
   * association so that the collection filter is applied in the database rather than in memory.
   */
  private async findInScope(userId: string, scope: RevokeScope) {
    const attributes = ["id", "documentId", "collectionId"];

    if (scope.documentId) {
      return Notification.unscoped().findAll({
        attributes,
        where: {
          userId,
          documentId: await this.documentAndChildIds(scope.documentId),
        },
      });
    }

    if (scope.collectionId) {
      return Notification.unscoped().findAll({
        attributes,
        where: {
          userId,
          [Op.or]: [
            { collectionId: scope.collectionId },
            { "$document.collectionId$": scope.collectionId },
          ],
        },
        include: [
          {
            model: Document.unscoped(),
            as: "document",
            attributes: [],
            required: false,
            paranoid: false,
          },
        ],
      });
    }

    return Notification.unscoped().findAll({
      attributes,
      where: { userId },
    });
  }

  /**
   * Returns the given document id along with the ids of all documents nested beneath it, as
   * memberships – and therefore access – cascade to nested documents.
   */
  private async documentAndChildIds(documentId: string) {
    const document = Document.build({ id: documentId });

    return [
      documentId,
      ...(await document.findAllChildDocumentIds(undefined, {
        paranoid: false,
      })),
    ];
  }
}
