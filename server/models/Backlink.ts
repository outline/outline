import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
} from "sequelize-typescript";
import Document from "./Document";
import Relationship, { RelationshipType } from "./Relationship";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "backlinks", modelName: "backlink" })
@Fix
class Backlink extends IdModel<
  InferAttributes<Backlink>,
  Partial<InferCreationAttributes<Backlink>>
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

  /**
   * Find all backlinks for a document that the user has access to
   *
   * @param documentId The document ID to find backlinks for
   * @param user The user to check access for
   */
  public static async findSourceDocumentIdsForUser(
    documentId: string,
    user: User
  ) {
    // Delegate to Relationship model for actual implementation
    return Relationship.findSourceDocumentIdsForUser(documentId, user);
  }

  /**
   * Create a new backlink relationship
   */
  public static async findOrCreate(options: any) {
    // Delegate to Relationship model with backlink type
    return Relationship.findOrCreate({
      ...options,
      defaults: {
        ...options.defaults,
        type: RelationshipType.Backlink,
      },
    });
  }

  /**
   * Find all backlinks matching criteria
   */
  public static async findAll(options: any) {
    // Delegate to Relationship model with backlink type filter
    return Relationship.findAll({
      ...options,
      where: {
        ...options.where,
        type: RelationshipType.Backlink,
      },
    });
  }

  /**
   * Destroy backlinks matching criteria
   */
  public static async destroy(options: any) {
    // Delegate to Relationship model with backlink type filter
    return Relationship.destroy({
      ...options,
      where: {
        ...options.where,
        type: RelationshipType.Backlink,
      },
    });
  }
}

export default Backlink;
