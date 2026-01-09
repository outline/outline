import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Table,
  ForeignKey,
  Column,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  DataType,
  Default,
  AllowNull,
  DefaultScope,
} from "sequelize-typescript";
import Model from "@server/models/base/Model";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";

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
      association: "document",
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
class AccessRequest extends Model<
  InferAttributes<AccessRequest>,
  Partial<InferCreationAttributes<AccessRequest>>
> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Default(AccessRequestStatus.Pending)
  @Column(DataType.STRING)
  status: AccessRequestStatus;

  @AllowNull
  @Column
  respondedAt: Date | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

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
