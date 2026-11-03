import type {
  FindOrCreateOptions,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import { Op, QueryTypes } from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import type { APIContext } from "@server/types";
import Document from "./Document";
import Event from "./Event";
import User from "./User";
import IdModel from "./base/IdModel";
import { SkipChangeset } from "./decorators/Changeset";

@Scopes(() => ({
  withUser: () => ({
    include: [
      {
        model: User,
        required: true,
        as: "user",
      },
    ],
  }),
}))
@Table({ tableName: "views", modelName: "view" })
class View extends IdModel<
  InferAttributes<View>,
  Partial<InferCreationAttributes<View>>
> {
  @Column(DataType.DATE)
  lastEditingAt: Date | null;

  @Default(1)
  @Column(DataType.INTEGER)
  @SkipChangeset
  count: number;

  // associations

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

  static async incrementOrCreate(
    ctx: APIContext,
    where: {
      userId: string;
      documentId: string;
    },
    options?: FindOrCreateOptions<InferAttributes<View>>
  ) {
    // Try to increment existing record
    const [[models]] = await this.increment("count", {
      where,
      ...options,
    });

    // @ts-expect-error Return type of increment is incorrect
    let model = models?.[0] as View | undefined;

    if (model) {
      // Manually create event to match createWithCtx behavior
      await Event.createFromContext(ctx, {
        name: "views.create",
        modelId: model.id,
        userId: model.userId,
        documentId: model.documentId,
      });
      return model;
    }

    // If no record exists, create a new one
    model = await this.createWithCtx(ctx, {
      ...where,
      count: 1,
      ...options?.defaults,
    });

    return model;
  }

  static async findByDocument(
    documentId: string,
    {
      includeSuspended,
      offset,
      limit,
    }: { includeSuspended?: boolean; offset?: number; limit?: number }
  ) {
    return this.findAll({
      where: {
        documentId,
      },
      order: [
        ["updatedAt", "DESC"],
        ["id", "ASC"],
      ],
      include: [
        {
          model: User,
          required: true,
          ...(includeSuspended
            ? {}
            : { where: { suspendedAt: { [Op.is]: null } } }),
        },
      ],
      offset,
      limit,
    });
  }

  /**
   * Find the ids of the views of a user, for documents that the user can
   * still access, in the requested order.
   *
   * @param user the user that owns the views.
   * @param options the sort, direction and pagination of the results.
   * @returns a promise that resolves to the view ids.
   */
  static async findAccessibleIds(
    user: User,
    {
      sort,
      direction,
      offset,
      limit,
    }: {
      sort: "updatedAt" | "createdAt";
      direction: string;
      offset: number;
      limit: number;
    }
  ): Promise<string[]> {
    const [collectionIds, documentIds] = await Promise.all([
      user.collectionIds(),
      Document.membershipDocumentIds(user.id),
    ]);
    const column = sort === "createdAt" ? "createdAt" : "updatedAt";
    const order = direction === "ASC" ? "ASC" : "DESC";

    // The OFFSET 0 in the lateral subquery stops the planner from turning it
    // into a join, so that it reads views in index order and stops at the limit.
    const rows = await this.sequelize!.query<{ id: string }>(
      `
      SELECT views.id
      FROM views
      CROSS JOIN LATERAL (
        SELECT 1
        FROM documents
        WHERE documents.id = views."documentId"
          AND documents."teamId" = :teamId
          AND documents."deletedAt" IS NULL
          AND (
            documents."collectionId" = ANY(ARRAY[:collectionIds]::uuid[])
            OR documents.id = ANY(ARRAY[:documentIds]::uuid[])
            OR (documents."createdById" = :userId AND documents."collectionId" IS NULL)
          )
          AND (
            documents."publishedAt" IS NOT NULL
            OR documents."createdById" = :userId
            OR documents.id = ANY(ARRAY[:documentIds]::uuid[])
          )
        OFFSET 0
      ) AS accessible
      WHERE views."userId" = :userId
      ORDER BY views."${column}" ${order}
      LIMIT :limit OFFSET :offset
      `,
      {
        replacements: {
          userId: user.id,
          teamId: user.teamId,
          collectionIds,
          documentIds,
          limit,
          offset,
        },
        type: QueryTypes.SELECT,
      }
    );

    return rows.map((row) => row.id);
  }

  static async touch(documentId: string, userId: string, isEditing: boolean) {
    const values: Partial<View> = {
      updatedAt: new Date(),
    };

    if (isEditing) {
      values.lastEditingAt = new Date();
    }

    await this.update(values, {
      where: {
        userId,
        documentId,
      },
      returning: false,
    });
  }
}

export default View;
