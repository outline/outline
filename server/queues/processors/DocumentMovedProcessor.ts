import type { Transaction } from "sequelize";
import { Document, GroupMembership, UserMembership } from "@server/models";
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

      const childDocumentIds = await document.findAllChildDocumentIds(
        undefined,
        { transaction }
      );
      const documentIds = [document.id, ...childDocumentIds];

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

      // Memberships granted directly on the moved document or any of its
      // children are kept, but the sourced memberships they created on
      // children are destroyed below along with the inherited ones, so they
      // must be recreated.
      const [ownUserMemberships, ownGroupMemberships] = await Promise.all([
        UserMembership.findAll({
          where: { sourceId: null, documentId: documentIds },
          transaction,
        }),
        GroupMembership.findAll({
          where: { sourceId: null, documentId: documentIds },
          transaction,
        }),
      ]);

      await this.destroyUserMemberships(documentIds, transaction);
      await this.destroyGroupMemberships(documentIds, transaction);

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

      await this.recalculateUserMemberships(ownUserMemberships, transaction);
      await this.recalculateGroupMemberships(ownGroupMemberships, transaction);
    });
  }

  private async destroyUserMemberships(
    documentIds: string[],
    transaction: Transaction
  ) {
    await UserMembership.destroy({
      where: {
        sourceId: { [Op.ne]: null },
        documentId: documentIds,
      },
      transaction,
    });
  }

  private async destroyGroupMemberships(
    documentIds: string[],
    transaction: Transaction
  ) {
    await GroupMembership.destroy({
      where: {
        sourceId: { [Op.ne]: null },
        documentId: documentIds,
      },
      transaction,
    });
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
