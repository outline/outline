import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { Op, type SaveOptions } from "sequelize";
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
  Unique,
  BeforeUpdate,
} from "sequelize-typescript";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { ShareValidation } from "@shared/validations";
import env from "@server/env";
import { ValidationError } from "@server/errors";
import type { APIContext } from "@server/types";
import Collection from "./Collection";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import IsFQDN from "./validators/IsFQDN";
import IsUrlOrRelativePath from "./validators/IsUrlOrRelativePath";
import Length from "./validators/Length";

@DefaultScope(() => ({
  include: [
    {
      association: "user",
      paranoid: false,
    },
    {
      association: "collection",
      required: false,
    },
    {
      association: "document",
      required: false,
    },
    {
      association: "team",
      required: true,
    },
  ],
}))
@Scopes(() => ({
  withCollectionPermissions: (userId: string) => ({
    include: [
      {
        attributes: [
          "id",
          "name",
          "permission",
          "sharing",
          "urlId",
          "teamId",
          "deletedAt",
        ],
        model: Collection.scope({
          method: ["withMembership", userId],
        }),
        as: "collection",
      },
      {
        model: Document.scope([
          "withDrafts",
          {
            method: ["withMembership", userId],
          },
        ]),
        paranoid: true,
        as: "document",
        include: [
          {
            attributes: [
              "id",
              "name",
              "permission",
              "urlId",
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
  }),
}))
@Table({ tableName: "shares", modelName: "share" })
class Share extends IdModel<
  InferAttributes<Share>,
  Partial<InferCreationAttributes<Share>>
> {
  @Column(DataType.BOOLEAN)
  published: boolean;

  @Column(DataType.BOOLEAN)
  includeChildDocuments: boolean;

  @Column(DataType.DATE)
  revokedAt: Date | null;

  @Column(DataType.DATE)
  lastAccessedAt: Date | null;

  /** Total count of times the shared link has been accessed */
  @Default(0)
  @Column(DataType.INTEGER)
  views: number;

  @AllowNull
  @Is({
    args: UrlHelper.SHARE_URL_SLUG_REGEX,
    msg: "Must be only alphanumeric and dashes",
  })
  @Column(DataType.STRING)
  urlId: string | null | undefined;

  @Unique
  @Length({ max: 255, msg: "domain must be 255 characters or less" })
  @IsFQDN
  @Column(DataType.STRING)
  domain: string | null;

  @Default(false)
  @Column(DataType.BOOLEAN)
  allowIndexing: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  allowSubscriptions: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  showLastUpdated: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  showTOC: boolean;

  @AllowNull
  @Length({
    max: ShareValidation.maxTitleLength,
    msg: `title must be ${ShareValidation.maxTitleLength} characters or less`,
  })
  @Column(DataType.STRING)
  title: string | null;

  @AllowNull
  @IsUrlOrRelativePath
  @Length({
    max: ShareValidation.maxIconUrlLength,
    msg: `iconUrl must be ${ShareValidation.maxIconUrlLength} characters or less`,
  })
  @Column(DataType.STRING)
  iconUrl: string | null;

  // hooks

  @BeforeUpdate
  static async checkDomain(model: Share, options: SaveOptions) {
    if (!model.domain) {
      return model;
    }

    model.domain = model.domain.toLowerCase();

    const count = await Team.count({
      ...options,
      where: {
        domain: model.domain,
      },
    });

    if (count > 0) {
      throw ValidationError("Domain is already in use");
    }

    return model;
  }

  // static methods

  /**
   * Finds published, non-revoked shares for the given document(s) within a team.
   *
   * @param teamId - the team the documents belong to.
   * @param documentIds - a single document ID or an array of document IDs.
   * @returns the matching public shares.
   */
  static getPublicSharesForDocumentIds(
    teamId: string,
    documentIds: string | string[]
  ): Promise<Share[]> {
    return this.findPublicShares(teamId, "documentId", documentIds);
  }

  /**
   * Finds published, non-revoked shares for the given collection(s) within a team.
   *
   * @param teamId - the team the collections belong to.
   * @param collectionIds - a single collection ID or an array of collection IDs.
   * @returns the matching public shares.
   */
  static getPublicSharesForCollectionIds(
    teamId: string,
    collectionIds: string | string[]
  ): Promise<Share[]> {
    return this.findPublicShares(teamId, "collectionId", collectionIds);
  }

  // getters

  get isRevoked() {
    return !!this.revokedAt;
  }

  get canonicalUrl() {
    if (this.domain) {
      const url = new URL(env.URL);
      return `${url.protocol}//${this.domain}${url.port ? `:${url.port}` : ""}`;
    }

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

  @BelongsTo(() => Collection, "collectionId")
  collection: Collection | null;

  @ForeignKey(() => Collection)
  @Column(DataType.UUID)
  collectionId: string | null;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  revoke(ctx: APIContext) {
    const { user } = ctx.state.auth;
    this.revokedAt = new Date();
    this.revokedById = user.id;
    return this.saveWithCtx(ctx, undefined, { name: "revoke" });
  }

  private static findPublicShares(
    teamId: string,
    column: "documentId" | "collectionId",
    ids: string | string[]
  ): Promise<Share[]> {
    const values = Array.isArray(ids) ? ids : [ids];
    if (values.length === 0) {
      return Promise.resolve([]);
    }

    return this.unscoped().findAll({
      where: {
        teamId,
        published: true,
        revokedAt: { [Op.is]: null },
        [column]: values,
      },
      // Deterministic order so the same share consistently wins when a
      // resource has more than one active share.
      order: [["createdAt", "ASC"]],
    });
  }
}

export default Share;
