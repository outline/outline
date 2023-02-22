import {
  DataType,
  BelongsTo,
  ForeignKey,
  Column,
  Table,
  AllowNull,
  AfterCreate,
  DefaultScope,
} from "sequelize-typescript";
import type { SaveOptions } from "sequelize/types";
import Document from "./Document";
import Event from "./Event";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@DefaultScope(() => ({
  include: [
    {
      model: User,
      as: "user",
    },
    {
      model: User,
      as: "mentionedUser",
    },
    {
      model: Document,
      as: "document",
    },
  ],
}))
@Table({ tableName: "mentions", modelName: "mention" })
@Fix
class Mention extends IdModel {
  @BelongsTo(() => User, "userId")
  user: User | null | undefined;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string | null | undefined;

  @BelongsTo(() => User, "mentionUserId")
  mentionedUser: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  mentionUserId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @AfterCreate
  static async triggerEvent(mention: Mention, options: SaveOptions<Mention>) {
    if (options.transaction) {
      options.transaction.afterCommit(
        () =>
          void Event.create({
            name: "mentions.create",
            modelId: mention.id,
            documentId: mention.documentId,
            actorId: mention.userId,
            userId: mention.mentionUserId,
          })
      );
      return;
    }
    void Event.create({
      name: "mentions.create",
      modelId: mention.id,
      documentId: mention.documentId,
      actorId: mention.userId,
      userId: mention.mentionUserId,
    });
  }
}

export default Mention;
