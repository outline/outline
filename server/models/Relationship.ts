import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";

export enum RelationshipType {
  Backlink = "backlink",
  Similar = "similar",
}

@Table({ tableName: "relationships", modelName: "relationship" })
class Relationship extends IdModel<
  InferAttributes<Relationship>,
  Partial<InferCreationAttributes<Relationship>>
> {
  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Document, "reverseDocumentId")
  reverseDocument: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  reverseDocumentId: string;

  @Column({
    type: DataType.ENUM(...Object.values(RelationshipType)),
    allowNull: false,
    defaultValue: RelationshipType.Backlink,
  })
  type: RelationshipType;

  /**
   * Find the ids of the documents that link to a document. The caller must
   * limit the documents to those the user can read.
   *
   * @param documentId The document ID to find backlinks for.
   * @deprecated
   */
  public static async findSourceDocumentIds(documentId: string) {
    const relationships = await this.findAll({
      attributes: ["reverseDocumentId"],
      where: {
        documentId,
        type: RelationshipType.Backlink,
      },
    });

    return relationships.map((relationship) => relationship.reverseDocumentId);
  }

  /**
   * Find all backlinks for a document that are within a shared tree.
   *
   * @param documentId The document ID to find backlinks for.
   * @param allowedDocumentIds Array of document IDs that are accessible in the shared tree.
   * @returns Array of document IDs that link to the target document and are within the shared tree.
   */
  public static async findSourceDocumentIdsInSharedTree(
    documentId: string,
    allowedDocumentIds: string[]
  ) {
    const relationships = await this.findAll({
      attributes: ["reverseDocumentId"],
      where: {
        documentId,
        type: RelationshipType.Backlink,
        reverseDocumentId: allowedDocumentIds,
      },
    });

    return relationships.map((relationship) => relationship.reverseDocumentId);
  }
}

export default Relationship;
