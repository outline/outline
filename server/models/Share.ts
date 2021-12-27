import {
  ForeignKey,
  BelongsTo,
  Column,
  DefaultScope,
  Table,
  Scopes,
} from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";

@DefaultScope(() => ({
  include: [
    {
      association: "user",
      paranoid: false,
    },
    {
      association: "document",
    },
    {
      association: "team",
    },
  ],
}))
@Scopes(() => ({
  withCollection: (userId: string) => {
    return {
      include: [
        {
          model: Document,
          paranoid: true,
          as: "document",
          include: [
            {
              model: Collection.scope({
                method: ["withMembership", userId],
              }),
              as: "collection",
            },
          ],
        },
        {
          association: "user",
          paranoid: false,
        },
        {
          association: "team",
        },
      ],
    };
  },
}))
@Table({ tableName: "shares", modelName: "share" })
class Share extends BaseModel {
  @Column
  published: boolean;

  @Column
  includeChildDocuments: boolean;

  @Column
  revokedAt: Date | null;

  @Column
  lastAccessedAt: Date | null;

  revoke(userId: string) {
    this.revokedAt = new Date();
    this.revokedById = userId;
    return this.save();
  }

  get isRevoked() {
    return !!this.revokedAt;
  }

  // associations

  @BelongsTo(() => User, "revokedById")
  revokedBy: User;

  @ForeignKey(() => User)
  @Column
  revokedById: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column
  teamId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column
  documentId: string;
}

export default Share;
