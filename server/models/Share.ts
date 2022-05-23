import {
  ForeignKey,
  BelongsTo,
  Column,
  DefaultScope,
  Table,
  Scopes,
  DataType,
} from "sequelize-typescript";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import BaseModel from "./base/BaseModel";
import Fix from "./decorators/Fix";

@DefaultScope(() => ({
  include: [
    {
      association: "user",
      paranoid: false,
    },
    {
      association: "document",
      required: false,
    },
    {
      association: "team",
    },
  ],
}))
@Scopes(() => ({
  withCollectionPermissions: (userId: string) => {
    return {
      include: [
        {
          model: Document.scope("withDrafts"),
          paranoid: true,
          as: "document",
          include: [
            {
              attributes: [
                "id",
                "permission",
                "sharing",
                "teamId",
                "deletedAt",
              ],
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
@Fix
class Share extends BaseModel {
  @Column
  published: boolean;

  @Column
  includeChildDocuments: boolean;

  @Column
  revokedAt: Date | null;

  @Column
  lastAccessedAt: Date | null;

  // getters

  get isRevoked() {
    return !!this.revokedAt;
  }

  // associations

  @BelongsTo(() => User, "revokedById")
  revokedBy: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  revokedById: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  revoke(userId: string) {
    this.revokedAt = new Date();
    this.revokedById = userId;
    return this.save();
  }
}

export default Share;
