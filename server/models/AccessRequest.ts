import type { InferAttributes, InferCreationAttributes } from "sequelize";
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
  static async validateNoDuplicatePendingRequest(instance: AccessRequest) {
    const { documentId, userId } = instance;

    const existingRequest = await this.pendingRequest({ documentId, userId });

    if (existingRequest) {
      throw ValidationError(
        "A pending access request already exists for this document and user."
      );
    }
  }

  /**
   * get the user's pending request.
   *
   * @param documentId The document ID or slug.
   * @param userId The user ID.
   *
   * @returns the pending request or null.
   */
  public static async pendingRequest({
    documentId,
    userId,
  }: {
    documentId?: string;
    userId?: string;
  }): Promise<AccessRequest | null> {
    if (!documentId || !userId) {
      return null;
    }

    const document = await Document.findByPk(documentId);
    if (!document) {
      return null;
    }

    const req = await this.findOne({
      where: {
        documentId: document.id,
        userId,
        status: AccessRequestStatus.Pending,
      },
    });
    return req;
  }
}

export default AccessRequest;
