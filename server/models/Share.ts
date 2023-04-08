import {
  ForeignKey,
  BelongsTo,
  Column,
  DefaultScope,
  Table,
  Scopes,
  DataType,
  Default,
  AllowNull,
  Is,
} from "sequelize-typescript";
import { SHARE_URL_SLUG_REGEX } from "@shared/utils/urlHelpers";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
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
  withCollectionPermissions: (userId: string) => ({
    include: [
      {
        model: Document.scope("withDrafts"),
        paranoid: true,
        as: "document",
        include: [
          {
            attributes: ["id", "permission", "sharing", "teamId", "deletedAt"],
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
  }),
}))
@Table({ tableName: "shares", modelName: "share" })
@Fix
class Share extends IdModel {
  @Column
  published: boolean;

  @Column
  includeChildDocuments: boolean;

  @Column
  revokedAt: Date | null;

  @Column
  lastAccessedAt: Date | null;

  /** Total count of times the shared link has been accessed */
  @Default(0)
  @Column
  views: number;

  @AllowNull
  @Is({
    args: SHARE_URL_SLUG_REGEX,
    msg: "Must be only alphanumeric and dashes",
  })
  @Column
  urlId: string | null | undefined;

  // getters

  get isRevoked() {
    return !!this.revokedAt;
  }

  get canonicalUrl() {
    return this.urlId
      ? `${this.team.url}/s/${this.urlId}`
      : `${this.team.url}/s/${this.id}`;
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
  document: Document | null;

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
