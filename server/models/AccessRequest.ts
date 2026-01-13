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

    const existingRequest = await this.hasPendingRequest(documentId, userId);

    if (existingRequest) {
      throw ValidationError(
        "A pending access request already exists for this document and user."
      );
    }
  }

  /**
   * Check if the user has a pending request on this document.
   *
   * @param documentId The document ID.
   * @param userId The user ID.
   * @returns True if there's a pending request.
   */
  public static async hasPendingRequest(
    documentId: string,
    userId: string
  ): Promise<boolean> {
    if (!documentId || !userId) {
      return false;
    }

    const count = await this.count({
      where: {
        documentId,
        userId,
        status: AccessRequestStatus.Pending,
      },
    });
    return count > 0;
  }
}

export default AccessRequest;
