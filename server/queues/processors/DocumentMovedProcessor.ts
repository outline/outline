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

      const documentIds = [
        document.id,
        ...(await document.findAllChildDocumentIds(undefined, {
          transaction,
        })),
      ];

      await this.destroySourcedMemberships(documentIds, transaction);

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

      // Direct memberships within the moved tree must also flow down again.
      const [directUserMemberships, directGroupMemberships] = await Promise.all(
        [
          UserMembership.findAll({
            where: { documentId: documentIds, sourceId: null },
            transaction,
          }),
          GroupMembership.findAll({
            where: { documentId: documentIds, sourceId: null },
            transaction,
          }),
        ]
      );

      await this.recalculateUserMemberships(directUserMemberships, transaction);
      await this.recalculateGroupMemberships(
        directGroupMemberships,
        transaction
      );
    });
  }

  private async destroySourcedMemberships(
    documentIds: string[],
    transaction: Transaction
  ) {
    const where = {
      sourceId: { [Op.ne]: null },
      documentId: documentIds,
    };

    await UserMembership.destroy({ where, transaction });
    await GroupMembership.destroy({ where, transaction });
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
