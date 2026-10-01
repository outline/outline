import type {
  InferAttributes,
  InferCreationAttributes,
  Transaction,
} from "sequelize";
import { QueryTypes } from "sequelize";
import {
  BeforeValidate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  NotEmpty,
  Table,
} from "sequelize-typescript";
import { TagValidation } from "@shared/validations";
import { normalizeTagName } from "@shared/utils/TagHelper";
import Document from "./Document";
import DocumentTag from "./DocumentTag";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import IsHexColor from "./validators/IsHexColor";
import Length from "./validators/Length";

@Table({ tableName: "tags", modelName: "tag" })
class Tag extends IdModel<
  InferAttributes<Tag>,
  Partial<InferCreationAttributes<Tag>>
> {
  @NotEmpty
  @Length({
    max: TagValidation.maxNameLength,
    msg: `name must be ${TagValidation.maxNameLength} characters or less`,
  })
  @Column(DataType.STRING)
  name: string;

  /** The color used to display the tag, as a hex value (e.g. #FF0000). */
  @IsHexColor
  @Column(DataType.STRING)
  color: string | null;

  // associations

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "createdById")
  createdBy: User | null;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  createdById: string | null;

  @HasMany(() => DocumentTag, "tagId")
  documentTags: DocumentTag[];

  // hooks

  @BeforeValidate
  static normalizeName(model: Tag) {
    model.name = normalizeTagName(model.name);
  }

  // static methods

  /**
   * Finds the tags attached to at least one non-deleted document the user can
   * read, using the same visibility rules as search. The `documentCount`
   * counts only readable documents that are not archived.
   *
   * @param user The user to find tags for.
   * @param options Sorting and pagination options.
   * @returns the tags, each with its readable document count.
   */
  static async findAllReadable(
    user: User,
    options: {
      sort: "name" | "documentCount";
      direction: "ASC" | "DESC";
      offset: number;
      limit: number;
    }
  ): Promise<{ tag: Tag; documentCount: number }[]> {
    const { from, replacements } = await this.readableTagsQuery(user);

    // sort and direction are validated enums, mapped here so no request value
    // reaches the query text
    const sortColumn =
      options.sort === "documentCount" ? `"documentCount"` : `"tag"."name"`;
    const direction = options.direction === "DESC" ? "DESC" : "ASC";

    const tags = await this.sequelize!.query<Tag>(
      `SELECT "tag".*,
        (COUNT(*) FILTER (WHERE d."archivedAt" IS NULL))::int AS "documentCount"
      ${from}
      GROUP BY "tag".id
      ORDER BY ${sortColumn} ${direction}, "tag".id ASC
      LIMIT :limit OFFSET :offset`,
      {
        type: QueryTypes.SELECT,
        model: this,
        mapToModel: true,
        replacements: {
          ...replacements,
          limit: options.limit,
          offset: options.offset,
        },
      }
    );

    return tags.map((tag) => ({
      tag,
      documentCount: Number(
        (tag.dataValues as { documentCount?: unknown }).documentCount
      ),
    }));
  }

  /**
   * Counts the tags returned by `findAllReadable` across all pages.
   *
   * @param user The user to count tags for.
   * @returns the number of tags visible to the user.
   */
  static async countReadable(user: User): Promise<number> {
    const { from, replacements } = await this.readableTagsQuery(user);
    const [row] = await this.sequelize!.query<{ count: string }>(
      `SELECT COUNT(DISTINCT "tag".id) AS count ${from}`,
      { type: QueryTypes.SELECT, replacements }
    );
    return Number(row?.count ?? 0);
  }

  /**
   * Counts the readable, non-archived documents carrying a tag, matching the
   * `documentCount` returned by `findAllReadable`.
   *
   * @param user The user to count documents for.
   * @param tagId The id of the tag.
   * @param options.transaction The transaction to read within.
   * @returns the number of documents.
   */
  static async readableDocumentCount(
    user: User,
    tagId: string,
    options: { transaction?: Transaction } = {}
  ): Promise<number> {
    const { from, replacements } = await this.readableTagsQuery(user, options);
    const [row] = await this.sequelize!.query<{ count: string }>(
      `SELECT COUNT(*) FILTER (WHERE d."archivedAt" IS NULL) AS count
      ${from} AND "tag".id = :tagId`,
      {
        type: QueryTypes.SELECT,
        replacements: { ...replacements, tagId },
        transaction: options.transaction,
      }
    );
    return Number(row?.count ?? 0);
  }

  /**
   * Builds the FROM and WHERE clauses selecting each tag joined to the
   * non-deleted documents the user can read.
   *
   * @param user The user to build the query for.
   * @param options.transaction The transaction to read collections within.
   * @returns the query text and its bound replacements.
   */
  private static async readableTagsQuery(
    user: User,
    options: { transaction?: Transaction } = {}
  ) {
    const [membershipDocumentIds, collectionIds] = await Promise.all([
      Document.membershipDocumentIds(user.id),
      user.collectionIds({ transaction: options.transaction }),
    ]);

    const visibility = [
      `(d."createdById" = :userId AND d."collectionId" IS NULL)`,
    ];
    if (membershipDocumentIds.length) {
      visibility.push(`d.id IN (:membershipDocumentIds)`);
    }
    if (collectionIds.length) {
      visibility.push(
        `(d."collectionId" IN (:collectionIds) AND d."publishedAt" IS NOT NULL)`,
        `(d."createdById" = :userId AND d."collectionId" IN (:collectionIds))`
      );
    }

    return {
      from: `FROM tags AS "tag"
      JOIN document_tags dt ON dt."tagId" = "tag".id
      JOIN documents d ON d.id = dt."documentId"
      WHERE "tag"."teamId" = :teamId
        AND d."teamId" = :teamId
        AND d."deletedAt" IS NULL
        AND d.template = false
        AND d."sourceMetadata"->>'trial' IS NULL
        AND (${visibility.join(" OR ")})`,
      replacements: {
        userId: user.id,
        teamId: user.teamId,
        membershipDocumentIds,
        collectionIds,
      },
    };
  }
}

export default Tag;
