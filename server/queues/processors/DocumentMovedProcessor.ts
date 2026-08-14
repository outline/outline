import type { Transaction } from "sequelize";
import { DocumentPermission } from "@shared/types";
import { createContext } from "@server/context";
import {
  Document,
  GroupMembership,
  User,
  UserMembership,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import type { DocumentMovedEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";
import { Op } from "sequelize";

export default class DocumentMovedProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["documents.move"];

  async perform(event: DocumentMovedEvent) {
    await sequelize.transaction(async (transaction) => {
      const document = await Document.findByPk(event.documentId, {
        transaction,
      });
      if (!document) {
        return;
      }

      // If there are any sourced memberships for this document, we need to go to the source
      // memberships and recalculate the membership for the user or group.
      const [parentDocumentUserMemberships, parentDocumentGroupMemberships] =
        await Promise.all([
          document.parentDocumentId
            ? UserMembership.findRootMembershipsForDocument(
                document.parentDocumentId,
                undefined,
                { transaction }
              )
            : [],

          document.parentDocumentId
            ? GroupMembership.findRootMembershipsForDocument(
                document.parentDocumentId,
                undefined,
                { transaction }
              )
            : [],
        ]);

      await this.destroyUserMemberships(document, transaction);
      await this.destroyGroupMemberships(document, transaction);

      await this.recalculateUserMemberships(
        parentDocumentUserMemberships,
        transaction,
        document.id
      );
      await this.recalculateGroupMemberships(
        parentDocumentGroupMemberships,
        transaction,
        document.id
      );

      await this.destroyRedundantRootMemberships(document, event, transaction);
    });
  }

  private async destroyUserMemberships(
    document: Document,
    transaction: Transaction
  ) {
    const childDocumentIds = await document.findAllChildDocumentIds(undefined, {
      transaction,
    });

    await UserMembership.destroy({
      where: {
        sourceId: { [Op.ne]: null },
        documentId: [...childDocumentIds, document.id],
      },
      transaction,
    });
  }

  private async destroyGroupMemberships(
    document: Document,
    transaction: Transaction
  ) {
    const childDocumentIds = await document.findAllChildDocumentIds(undefined, {
      transaction,
    });

    await GroupMembership.destroy({
      where: {
        sourceId: { [Op.ne]: null },
        documentId: [...childDocumentIds, document.id],
      },
      transaction,
    });
  }

  /**
   * Destroys direct root memberships on the moved document that have become
   * redundant because the same user or group now inherits an equal or greater
   * permission from the new parent. This prevents a document from appearing
   * both nested under its parent and at the root of the sidebar.
   */
  private async destroyRedundantRootMemberships(
    document: Document,
    event: DocumentMovedEvent,
    transaction: Transaction
  ) {
    if (!document.parentDocumentId) {
      return;
    }

    const [userMemberships, groupMemberships, actor] = await Promise.all([
      UserMembership.findAll({
        where: { documentId: document.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      }),
      GroupMembership.findAll({
        where: { documentId: document.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      }),
      User.findByPk(event.actorId, { transaction }),
    ]);

    if (!actor) {
      return;
    }

    const rank: Record<string, number> = {
      [DocumentPermission.Read]: 0,
      [DocumentPermission.ReadWrite]: 1,
      [DocumentPermission.Admin]: 2,
    };
    const { context } = createContext({ user: actor, transaction });

    for (const membership of userMemberships.filter((m) => !m.sourceId)) {
      const inherited = userMemberships.find(
        (m) => m.sourceId && m.userId === membership.userId
      );
      if (
        inherited &&
        rank[inherited.permission] >= rank[membership.permission]
      ) {
        await membership.destroy(context);
      }
    }

    for (const membership of groupMemberships.filter((m) => !m.sourceId)) {
      const inherited = groupMemberships.find(
        (m) => m.sourceId && m.groupId === membership.groupId
      );
      if (
        inherited &&
        rank[inherited.permission] >= rank[membership.permission]
      ) {
        await membership.destroy(context);
      }
    }
  }

  private async recalculateUserMemberships(
    memberships: UserMembership[],
    transaction?: Transaction,
    documentId?: string
  ) {
    await Promise.all(
      memberships.map((membership) =>
        UserMembership.createSourcedMemberships(membership, {
          transaction,
          documentId,
        })
      )
    );
  }

  private async recalculateGroupMemberships(
    memberships: GroupMembership[],
    transaction?: Transaction,
    documentId?: string
  ) {
    await Promise.all(
      memberships.map((membership) =>
        GroupMembership.createSourcedMemberships(membership, {
          transaction,
          documentId,
        })
      )
    );
  }
}
