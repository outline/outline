import {
  FindOrCreateOptions,
  InferAttributes,
  InferCreationAttributes,
  Op,
} from "sequelize";
import {
  BelongsTo,
  Column,
  Default,
  ForeignKey,
  Table,
  DataType,
  Scopes,
} from "sequelize-typescript";
import { APIContext } from "@server/types";
import Document from "./Document";
import Event from "./Event";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";
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
@Fix
class View extends IdModel<
  InferAttributes<View>,
  Partial<InferCreationAttributes<View>>
> {
  @Column
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
    { includeSuspended }: { includeSuspended?: boolean }
  ) {
    return this.findAll({
      where: {
        documentId,
      },
      order: [["updatedAt", "DESC"]],
      include: [
        {
          model: User,
          required: true,
          ...(includeSuspended
            ? {}
            : { where: { suspendedAt: { [Op.is]: null } } }),
        },
      ],
    });
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
