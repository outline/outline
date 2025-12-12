import { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
} from "sequelize-typescript";
import { MentionType } from "@shared/types";
import Document from "./Document";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "mentions", modelName: "mention" })
@Fix
class Mention extends IdModel<
  InferAttributes<Mention>,
  Partial<InferCreationAttributes<Mention>>
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

  @BelongsTo(() => User, "mentionedUserId")
  mentionedUser: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  mentionedUserId: string;

  @Column(DataType.STRING)
  mentionType: MentionType;

  @Column(DataType.STRING)
  mentionId: string;

  /**
   * Find all mentions for a user in documents they have access to
   *
   * @param userId The user ID to find mentions for
   * @param user The user to check document access for
   */
  public static async findMentionsForUser(userId: string, user: User) {
    // Lazy import to avoid circular dependency
    const { can } = await import("@server/policies");

    const mentions = await this.findAll({
      where: {
        mentionedUserId: userId,
      },
      include: [
        {
          model: Document,
          as: "document",
        },
      ],
    });

    // Filter mentions to only include documents the user has access to
    const accessibleMentions = [];
    for (const mention of mentions) {
      if (mention.document) {
        const hasAccess = can(user, "read", mention.document);
        if (hasAccess) {
          accessibleMentions.push(mention);
        }
      }
    }

    return accessibleMentions;
  }

  /**
   * Find all mentions in a specific document
   *
   * @param documentId The document ID to find mentions for
   */
  public static async findMentionsInDocument(documentId: string) {
    return this.findAll({
      where: {
        documentId,
      },
      include: [
        {
          model: User,
          as: "mentionedUser",
        },
      ],
    });
  }
}

export default Mention;
