import type {
  InferAttributes,
  InferCreationAttributes,
  SaveOptions,
} from "sequelize";
import {
  Table,
  ForeignKey,
  Column,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
  DefaultScope,
  BeforeCreate,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";
import IdModel from "./base/IdModel";
import { IsIn } from "class-validator";
import { ValidationError } from "@server/errors";
import type { APIContext } from "@server/types";

export enum AccessRequestStatus {
  Pending = "pending",
  Approved = "approved",
  Dismissed = "dismissed",
}

@DefaultScope(() => ({
  include: [
    {
      association: "user",
      required: true,
    },
    {
      association: "responder",
      required: false,
    },
  ],
}))
@Table({
  tableName: "access_requests",
  modelName: "access_request",
})
@Fix
class AccessRequest extends IdModel<
  InferAttributes<AccessRequest>,
  Partial<InferCreationAttributes<AccessRequest>>
> {
  @Default(AccessRequestStatus.Pending)
  @IsIn([Object.values(AccessRequestStatus)])
  @Column(DataType.STRING)
  status: AccessRequestStatus;

  @AllowNull
  @Column
  respondedAt: Date | null;

  // associations
  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

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

  @BelongsTo(() => User, "responderId")
  responder: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  responderId: string | null;

  @BeforeCreate
  static async validateNoDuplicatePendingRequest(
    instance: AccessRequest,
    options: SaveOptions<AccessRequest>
  ) {
    const { documentId, userId } = instance;

    const existingRequest = await this.findOne({
      where: {
        documentId,
        userId,
        status: AccessRequestStatus.Pending,
      },
      transaction: options.transaction,
    });

    if (existingRequest) {
      throw ValidationError(
        "A pending access request already exists for this document and user."
      );
    }
  }

  /**
   * Approve this access request, setting the status and responder, and persist.
   *
   * @param ctx the API context; the authenticated user is recorded as responder.
   */
  public approve(ctx: APIContext) {
    this.status = AccessRequestStatus.Approved;
    this.responderId = ctx.state.auth.user.id;
    this.respondedAt = new Date();
    return this.saveWithCtx(ctx);
  }

  /**
   * Dismiss this access request, setting the status and responder, and persist.
   *
   * @param ctx the API context; the authenticated user is recorded as responder.
   */
  public dismiss(ctx: APIContext) {
    this.status = AccessRequestStatus.Dismissed;
    this.responderId = ctx.state.auth.user.id;
    this.respondedAt = new Date();
    return this.saveWithCtx(ctx);
  }

  /**
   * get the user's pending request.
   *
   * @param documentId The document ID or slug.
   * @param userId The user ID.
   *
   * @returns the pending request or null.
   */
  public static async findPendingForUser({
    documentId,
    userId,
  }: {
    documentId?: string;
    userId?: string;
  }): Promise<AccessRequest | null> {
    if (!documentId || !userId) {
      return null;
    }

    return this.findOne({
      where: {
        documentId,
        userId,
        status: AccessRequestStatus.Pending,
      },
    });
  }
}

export default AccessRequest;
