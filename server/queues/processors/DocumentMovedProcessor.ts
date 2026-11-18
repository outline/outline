import { groupBy } from "es-toolkit";
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

      // Load the subtree once so that the published children of each
      // membership document are found without a query per membership.
      const documents = await Document.unscoped().findAll({
        attributes: ["id", "parentDocumentId", "publishedAt"],
        where: { id: documentIds },
        transaction,
      });
      const documentsByParentId = groupBy(
        documents,
        (doc) => doc.parentDocumentId ?? ""
      );

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
        documentsByParentId,
        document.id
      );
      await this.recalculateGroupMemberships(
        parentDocumentGroupMemberships,
        transaction,
        documentsByParentId,
        document.id
      );

      await this.recalculateUserMemberships(
        ownUserMemberships,
        transaction,
        documentsByParentId
      );
      await this.recalculateGroupMemberships(
        ownGroupMemberships,
        transaction,
        documentsByParentId
      );
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
    transaction: Transaction,
    documentsByParentId: Record<string, Document[]>,
    documentId?: string
  ) {
    await Promise.all(
      memberships.map(async (membership) => {
        const targetDocumentId = documentId ?? membership.documentId;
        if (!targetDocumentId) {
          return;
        }

        await UserMembership.createSourcedMemberships(membership, {
          transaction,
          documentId,
          childDocumentIds: this.getPublishedChildDocumentIds(
            targetDocumentId,
            documentsByParentId
          ),
        });
      })
    );
  }

  private async recalculateGroupMemberships(
    memberships: GroupMembership[],
    transaction: Transaction,
    documentsByParentId: Record<string, Document[]>,
    documentId?: string
  ) {
    await Promise.all(
      memberships.map(async (membership) => {
        const targetDocumentId = documentId ?? membership.documentId;
        if (!targetDocumentId) {
          return;
        }

        await GroupMembership.createSourcedMemberships(membership, {
          transaction,
          documentId,
          childDocumentIds: this.getPublishedChildDocumentIds(
            targetDocumentId,
            documentsByParentId
          ),
        });
      })
    );
  }

  /**
   * Find the published descendants of a document, without passing through
   * unpublished documents.
   *
   * @param documentId the id of the document to start from.
   * @param documentsByParentId the documents of the subtree, grouped by parent id.
   * @returns the ids of the published descendant documents.
   */
  private getPublishedChildDocumentIds(
    documentId: string,
    documentsByParentId: Record<string, Document[]>
  ): string[] {
    const result: string[] = [];
    let parentIds = [documentId];

    while (parentIds.length) {
      parentIds = parentIds
        .flatMap((parentId) => documentsByParentId[parentId] ?? [])
        .filter((doc) => doc.publishedAt)
        .map((doc) => doc.id);
      result.push(...parentIds);
    }

    return result;
  }
}
