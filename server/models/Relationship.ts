import { InferAttributes, InferCreationAttributes } from "sequelize";
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
import Fix from "./decorators/Fix";

export enum RelationshipType {
  Backlink = "backlink",
  Similar = "similar",
}

@Table({ tableName: "relationships", modelName: "relationship" })
@Fix
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
   * Find all backlinks for a document that the user has access to
   *
   * @param documentId The document ID to find backlinks for
   * @param user The user to check access for
   * @deprecated
   */
  public static async findSourceDocumentIdsForUser(
    documentId: string,
    user: User
  ) {
    const relationships = await this.findAll({
      attributes: ["reverseDocumentId"],
      where: {
        documentId,
        type: RelationshipType.Backlink,
      },
    });

    const documents = await Document.findByIds(
      relationships.map((relationship) => relationship.reverseDocumentId),
      { userId: user.id }
    );

    return documents.map((doc) => doc.id);
  }
}

export default Relationship;
