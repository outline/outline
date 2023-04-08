import type { SaveOptions } from "sequelize";
import {
  Table,
  ForeignKey,
  Model,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
  AfterSave,
  Scopes,
} from "sequelize-typescript";
import { NotificationEventType } from "@shared/types";
import Collection from "./Collection";
import Comment from "./Comment";
import Document from "./Document";
import Event from "./Event";
import Revision from "./Revision";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

@Scopes(() => ({
  withTeam: {
    include: [
      {
        association: "team",
      },
    ],
  },
  withUser: {
    include: [
      {
        association: "user",
      },
    ],
  },
  withActor: {
    include: [
      {
        association: "actor",
      },
    ],
  },
}))
@Table({
  tableName: "notifications",
  modelName: "notification",
  updatedAt: false,
})
@Fix
class Notification extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @AllowNull
  @Column
  emailedAt: Date;

  @AllowNull
  @Column
  viewedAt: Date;

  @CreatedAt
  createdAt: Date;

  @Column(DataType.STRING)
  event: NotificationEventType;

  // associations

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => User, "actorId")
  actor: User;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  actorId: string;

  @BelongsTo(() => Comment, "commentId")
  comment: Comment;

  @AllowNull
  @ForeignKey(() => Comment)
  @Column(DataType.UUID)
  commentId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @AllowNull
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  @BelongsTo(() => Revision, "revisionId")
  revision: Revision;

  @AllowNull
  @ForeignKey(() => Revision)
  @Column(DataType.UUID)
  revisionId: string;

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection;

  @AllowNull
  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @AfterSave
  static async createEvent(
    model: Notification,
    options: SaveOptions<Notification>
  ) {
    const params = {
      name: "notifications.create",
      userId: model.userId,
      modelId: model.id,
      teamId: model.teamId,
      documentId: model.documentId,
      actorId: model.actorId,
    };

    if (options.transaction) {
      options.transaction.afterCommit(() => void Event.schedule(params));
      return;
    }
    await Event.schedule(params);
  }
}

export default Notification;
