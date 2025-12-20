import type { Transaction } from "sequelize";
import { Document, GroupMembership, UserMembership } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { DocumentMovedEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

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
      const [
        userMemberships,
        parentDocumentUserMemberships,
        groupMemberships,
        parentDocumentGroupMemberships,
      ] = await Promise.all([
        UserMembership.findRootMembershipsForDocument(document.id, undefined, {
          transaction,
        }),
        document.parentDocumentId
          ? UserMembership.findRootMembershipsForDocument(
              document.parentDocumentId,
              undefined,
              { transaction }
            )
          : [],
        GroupMembership.findRootMembershipsForDocument(document.id, undefined, {
          transaction,
        }),
        document.parentDocumentId
          ? GroupMembership.findRootMembershipsForDocument(
              document.parentDocumentId,
              undefined,
              { transaction }
            )
          : [],
      ]);

      await this.recalculateUserMemberships(userMemberships, transaction);
      await this.recalculateUserMemberships(
        parentDocumentUserMemberships,
        transaction
      );
      await this.recalculateGroupMemberships(groupMemberships, transaction);
      await this.recalculateGroupMemberships(
        parentDocumentGroupMemberships,
        transaction
      );
    });
  }

  private async recalculateUserMemberships(
    memberships: UserMembership[],
    transaction?: Transaction
  ) {
    await Promise.all(
      memberships.map((membership) =>
        UserMembership.createSourcedMemberships(membership, {
          transaction,
        })
      )
    );
  }

  private async recalculateGroupMemberships(
    memberships: GroupMembership[],
    transaction?: Transaction
  ) {
    await Promise.all(
      memberships.map((membership) =>
        GroupMembership.createSourcedMemberships(membership, {
          transaction,
        })
      )
    );
  }
}
