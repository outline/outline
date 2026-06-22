import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsIn,
  Table,
} from "sequelize-typescript";
import {
  ChangeRequestRejectionReason,
  ChangeRequestStatus,
} from "@shared/types";
import Document from "./Document";
import Revision from "./Revision";
import Team from "./Team";
import User from "./User";
import Fix from "./decorators/Fix";
import IdModel from "./base/IdModel";

/**
 * Represents a proposed change to a document awaiting maintainer review.
 */
@Table({ tableName: "change_requests", modelName: "change_request" })
@Fix
class ChangeRequest extends IdModel<
  InferAttributes<ChangeRequest>,
  Partial<InferCreationAttributes<ChangeRequest>>
> {
  @Default(ChangeRequestStatus.Draft)
  @IsIn([Object.values(ChangeRequestStatus)])
  @Column(DataType.STRING)
  status: ChangeRequestStatus;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Document, "documentId")
  document?: Document | null;

  @AllowNull
  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;

  @BelongsTo(() => Document, "draftDocumentId")
  draftDocument: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  draftDocumentId: string;

  @BelongsTo(() => Revision, "baseRevisionId")
  baseRevision?: Revision | null;

  @AllowNull
  @ForeignKey(() => Revision)
  @Column(DataType.UUID)
  baseRevisionId: string | null;

  @AllowNull
  @Column(DataType.JSONB)
  proposedChanges: Record<string, unknown> | null;

  @BelongsTo(() => User, "submittedById")
  submittedBy?: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  submittedById: string | null;

  @AllowNull
  @Column
  submittedAt: Date | null;

  @BelongsTo(() => User, "reviewedById")
  reviewedBy?: User | null;

  @AllowNull
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  reviewedById: string | null;

  @AllowNull
  @Column
  reviewedAt: Date | null;

  @AllowNull
  @Column(DataType.TEXT)
  reviewNote: string | null;

  @AllowNull
  @IsIn([Object.values(ChangeRequestRejectionReason)])
  @Column(DataType.STRING)
  rejectionReason: ChangeRequestRejectionReason | null;
}

export default ChangeRequest;
